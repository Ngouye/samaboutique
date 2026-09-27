-- Fichier : admin_locations.sql
-- À exécuter dans l'éditeur SQL de Supabase APRÈS security_fixes.sql et security_fixes_2.sql.
--
--  1. Localisation des boutiques : enregistrée à l'inscription (si le marchand l'accepte)
--     ou depuis les paramètres. Visible uniquement par le marchand et l'administrateur,
--     jamais sur la fiche publique.
--  2. Tableau de bord administrateur : fonctions réservées à l'admin qui renvoient toutes
--     les informations des marchands et l'activité de la plateforme.

DO $$
BEGIN
    IF to_regprocedure('public.is_platform_admin()') IS NULL THEN
        RAISE EXCEPTION 'Exécutez d''abord security_fixes.sql puis security_fixes_2.sql';
    END IF;
END $$;

-- Colonnes lues par le tableau de bord (sans effet si elles existent déjà)
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS payout_provider TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS payout_phone_number TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS theme_color TEXT;

-- ===========================================================================
-- 1. Localisation des boutiques
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.merchant_locations (
    merchant_id UUID PRIMARY KEY REFERENCES public.merchants(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    accuracy_m INTEGER CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
    source TEXT NOT NULL DEFAULT 'gps',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Localisation : marchand ou admin" ON public.merchant_locations;
CREATE POLICY "Localisation : marchand ou admin"
    ON public.merchant_locations FOR SELECT TO authenticated
    USING (merchant_id = auth.uid() OR public.is_platform_admin());
-- Aucune politique d'écriture : les écritures passent par les fonctions ci-dessous.

-- Le marchand connecté enregistre (ou met à jour) la position de sa boutique.
CREATE OR REPLACE FUNCTION public.set_merchant_location(p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION, p_accuracy_m INTEGER DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.merchants WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Connexion requise.';
    END IF;
    IF p_latitude IS NULL OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
        RAISE EXCEPTION 'Coordonnées invalides.';
    END IF;

    INSERT INTO public.merchant_locations (merchant_id, latitude, longitude, accuracy_m, source, updated_at)
    VALUES (auth.uid(), p_latitude, p_longitude, greatest(p_accuracy_m, 0), 'parametres', now())
    ON CONFLICT (merchant_id) DO UPDATE
        SET latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            accuracy_m = EXCLUDED.accuracy_m,
            source = EXCLUDED.source,
            updated_at = now();

    RETURN json_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.set_merchant_location(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_merchant_location(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

-- Position partagée à l'inscription (métadonnées « location » du compte).
-- Trigger séparé : la création du profil marchand (on_auth_user_created) n'est pas modifiée,
-- et une position invalide ne bloque jamais l'inscription.
CREATE OR REPLACE FUNCTION public.handle_new_user_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lat DOUBLE PRECISION;
    v_lng DOUBLE PRECISION;
    v_acc INTEGER;
BEGIN
    BEGIN
        v_lat := (NEW.raw_user_meta_data -> 'location' ->> 'lat')::DOUBLE PRECISION;
        v_lng := (NEW.raw_user_meta_data -> 'location' ->> 'lng')::DOUBLE PRECISION;
        v_acc := round((NEW.raw_user_meta_data -> 'location' ->> 'accuracy')::NUMERIC)::INTEGER;
        IF v_lat BETWEEN -90 AND 90 AND v_lng BETWEEN -180 AND 180
           AND EXISTS (SELECT 1 FROM public.merchants WHERE id = NEW.id) THEN
            INSERT INTO public.merchant_locations (merchant_id, latitude, longitude, accuracy_m, source)
            VALUES (NEW.id, v_lat, v_lng, greatest(v_acc, 0), 'inscription')
            ON CONFLICT (merchant_id) DO NOTHING;
        END IF;
    EXCEPTION WHEN others THEN
        NULL;
    END;
    RETURN NEW;
END;
$$;

-- Le nom est choisi pour s'exécuter APRÈS on_auth_user_created (ordre alphabétique).
DROP TRIGGER IF EXISTS on_auth_user_created_location ON auth.users;
CREATE TRIGGER on_auth_user_created_location
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_location();

-- ===========================================================================
-- 2. Tableau de bord administrateur
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_merchants_overview()
RETURNS TABLE (
    id UUID,
    shop_name TEXT,
    phone_number TEXT,
    contact_email TEXT,
    account_email TEXT,
    address TEXT,
    description TEXT,
    logo_url TEXT,
    theme_color TEXT,
    subscription_plan TEXT,
    subscription_status TEXT,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    is_suspended BOOLEAN,
    payout_provider TEXT,
    payout_phone_number TEXT,
    social_links JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy_m INTEGER,
    location_source TEXT,
    location_updated_at TIMESTAMP WITH TIME ZONE,
    products_count BIGINT,
    drivers_count BIGINT,
    orders_count BIGINT,
    delivered_count BIGINT,
    revenue_fcfa BIGINT,
    last_order_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Accès réservé à l''administrateur de la plateforme.';
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        m.shop_name::TEXT,
        m.phone_number::TEXT,
        m.email::TEXT,
        u.email::TEXT,
        m.address::TEXT,
        m.description::TEXT,
        m.logo_url::TEXT,
        m.theme_color::TEXT,
        coalesce(m.subscription_plan, 'debutant')::TEXT,
        coalesce(m.subscription_status, 'active')::TEXT,
        m.subscription_end_date::TIMESTAMP WITH TIME ZONE,
        coalesce(m.is_suspended, false)::BOOLEAN,
        m.payout_provider::TEXT,
        m.payout_phone_number::TEXT,
        coalesce(m.social_links, '{}'::jsonb)::JSONB,
        m.created_at::TIMESTAMP WITH TIME ZONE,
        u.last_sign_in_at::TIMESTAMP WITH TIME ZONE,
        l.latitude,
        l.longitude,
        l.accuracy_m,
        l.source,
        l.updated_at,
        (SELECT count(*) FROM public.products p WHERE p.merchant_id = m.id),
        (SELECT count(*) FROM public.drivers d WHERE d.merchant_id = m.id),
        o.orders_count,
        o.delivered_count,
        o.revenue_fcfa,
        o.last_order_at
    FROM public.merchants m
    LEFT JOIN auth.users u ON u.id = m.id
    LEFT JOIN public.merchant_locations l ON l.merchant_id = m.id
    LEFT JOIN LATERAL (
        SELECT
            count(*) AS orders_count,
            count(*) FILTER (WHERE od.status = 'DELIVERED'::order_status) AS delivered_count,
            coalesce(sum(od.total_amount_fcfa) FILTER (WHERE od.status = 'DELIVERED'::order_status), 0)::BIGINT AS revenue_fcfa,
            max(od.created_at) AS last_order_at
        FROM public.orders od
        WHERE od.merchant_id = m.id
    ) o ON true
    ORDER BY m.created_at DESC;
END;
$$;

-- Activité quotidienne de la plateforme (fuseau de Dakar) sur les p_days derniers jours.
CREATE OR REPLACE FUNCTION public.admin_platform_series(p_days INTEGER DEFAULT 90)
RETURNS TABLE (
    day DATE,
    new_merchants BIGINT,
    orders_count BIGINT,
    delivered_revenue_fcfa BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_days INTEGER := least(greatest(coalesce(p_days, 90), 7), 730);
    v_today DATE := (now() AT TIME ZONE 'Africa/Dakar')::DATE;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Accès réservé à l''administrateur de la plateforme.';
    END IF;

    RETURN QUERY
    SELECT
        d::DATE,
        (SELECT count(*) FROM public.merchants m
          WHERE (m.created_at AT TIME ZONE 'Africa/Dakar')::DATE = d::DATE),
        (SELECT count(*) FROM public.orders o
          WHERE (o.created_at AT TIME ZONE 'Africa/Dakar')::DATE = d::DATE),
        (SELECT coalesce(sum(o.total_amount_fcfa), 0)::BIGINT FROM public.orders o
          WHERE o.status = 'DELIVERED'::order_status
            AND (coalesce(o.delivered_at, o.created_at) AT TIME ZONE 'Africa/Dakar')::DATE = d::DATE)
    FROM generate_series(v_today - (v_days - 1), v_today, interval '1 day') AS d
    ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_merchants_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_platform_series(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_merchants_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_platform_series(INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_location() FROM PUBLIC, anon, authenticated;
