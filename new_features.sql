-- Fichier : new_features.sql
-- À exécuter dans l'éditeur SQL de Supabase APRÈS security_fixes.sql, security_fixes_2.sql
-- et admin_locations.sql. Le script peut être relancé sans risque.
--
--  1. Notifications WhatsApp automatiques : chaque événement d'une commande est placé dans
--     une file d'attente (notification_outbox) que le serveur SamaBoutik envoie ensuite.
--  2. Annuaire public « Boutiques près de moi » : uniquement les boutiques qui l'ont accepté.
--  3. Mots-clés des produits (utilisés par la recherche de la vitrine).
--  4. Suivi du livreur en direct : position partagée pendant la course, visible par le client.

DO $$
BEGIN
    IF to_regclass('public.merchant_locations') IS NULL OR to_regprocedure('public.driver_session(text)') IS NULL THEN
        RAISE EXCEPTION 'Exécutez d''abord security_fixes.sql, security_fixes_2.sql puis admin_locations.sql';
    END IF;
END $$;

-- Réglages des marchands (tous activés par défaut, modifiables dans les paramètres)
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS whatsapp_notify_merchant BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS whatsapp_notify_customers BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- ===========================================================================
-- 1. Notifications WhatsApp
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    event TEXT NOT NULL,
    recipient TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'expired')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    provider_message_id TEXT,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sent_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (order_id, event)
);
CREATE INDEX IF NOT EXISTS notification_outbox_queue ON public.notification_outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS notification_outbox_merchant ON public.notification_outbox (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_outbox_recipient ON public.notification_outbox (recipient, created_at DESC);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications : marchand ou admin" ON public.notification_outbox;
CREATE POLICY "Notifications : marchand ou admin"
    ON public.notification_outbox FOR SELECT TO authenticated
    USING (merchant_id = auth.uid() OR public.is_platform_admin());
-- Aucune politique d'écriture : seuls les triggers ci-dessous et le serveur (service_role) écrivent.

-- Ajoute un message à la file. Ne bloque jamais une commande.
CREATE OR REPLACE FUNCTION public.enqueue_order_notification(p_order public.orders, p_event TEXT, p_to_merchant BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_merchant public.merchants;
    v_recipient TEXT;
    v_driver_phone TEXT;
BEGIN
    SELECT * INTO v_merchant FROM public.merchants WHERE id = p_order.merchant_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_to_merchant THEN
        IF NOT coalesce(v_merchant.whatsapp_notify_merchant, true) THEN RETURN; END IF;
        v_recipient := trim(coalesce(v_merchant.phone_number, ''));
    ELSE
        IF NOT coalesce(v_merchant.whatsapp_notify_customers, true) THEN RETURN; END IF;
        v_recipient := trim(coalesce(p_order.customer_phone, ''));
        -- Anti-abus : un numéro saisi par un inconnu ne reçoit pas plus de 6 messages par heure.
        IF (SELECT count(*) FROM public.notification_outbox
            WHERE recipient = v_recipient AND created_at > now() - interval '1 hour') >= 6 THEN
            RETURN;
        END IF;
    END IF;
    IF v_recipient = '' THEN
        RETURN;
    END IF;

    IF p_order.driver_name IS NOT NULL THEN
        SELECT d.phone_number INTO v_driver_phone
        FROM public.drivers d
        WHERE d.merchant_id = p_order.merchant_id AND d.full_name = p_order.driver_name
        LIMIT 1;
    END IF;

    INSERT INTO public.notification_outbox (order_id, merchant_id, event, recipient, payload)
    VALUES (p_order.id, p_order.merchant_id, p_event, v_recipient, jsonb_build_object(
        'order_ref', upper(split_part(p_order.id::TEXT, '-', 1)),
        'shop_name', v_merchant.shop_name,
        'shop_phone', v_merchant.phone_number,
        'customer_name', p_order.customer_name,
        'customer_phone', p_order.customer_phone,
        'customer_address', p_order.customer_address,
        'delivery_zone', p_order.delivery_zone,
        'total_amount_fcfa', p_order.total_amount_fcfa,
        'cart_items', p_order.cart_items,
        'delivery_pin', p_order.delivery_pin,
        'payment_method', p_order.payment_method,
        'driver_name', p_order.driver_name,
        'driver_phone', v_driver_phone
    ))
    ON CONFLICT (order_id, event) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_order_notification(public.orders, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;

-- Événements : nouvelle commande (paiement à la livraison) ou paiement Wave/OM confirmé,
-- livreur en route, commande livrée, commande annulée.
CREATE OR REPLACE FUNCTION public.orders_whatsapp_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    BEGIN
        IF TG_OP = 'INSERT' THEN
            -- Une commande Wave/Orange Money n'est annoncée qu'une fois payée.
            IF NEW.payment_method IS DISTINCT FROM 'MOBILE_MONEY' THEN
                PERFORM public.enqueue_order_notification(NEW, 'merchant_new_order', true);
                PERFORM public.enqueue_order_notification(NEW, 'customer_order_confirmed', false);
            END IF;
        ELSE
            IF NEW.payment_method = 'MOBILE_MONEY' AND NEW.payment_status = 'PAID'
               AND OLD.payment_status IS DISTINCT FROM 'PAID' THEN
                PERFORM public.enqueue_order_notification(NEW, 'merchant_new_order', true);
                PERFORM public.enqueue_order_notification(NEW, 'customer_order_confirmed', false);
            END IF;
            IF NEW.status IS DISTINCT FROM OLD.status THEN
                IF NEW.status::TEXT = 'IN_TRANSIT' THEN
                    PERFORM public.enqueue_order_notification(NEW, 'customer_in_transit', false);
                ELSIF NEW.status::TEXT = 'DELIVERED' THEN
                    PERFORM public.enqueue_order_notification(NEW, 'customer_delivered', false);
                ELSIF NEW.status::TEXT = 'CANCELLED' THEN
                    PERFORM public.enqueue_order_notification(NEW, 'customer_cancelled', false);
                END IF;
            END IF;
        END IF;
    EXCEPTION WHEN others THEN
        RAISE WARNING 'Notification WhatsApp non enregistrée : %', SQLERRM;
    END;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.orders_whatsapp_events() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_whatsapp_events ON public.orders;
CREATE TRIGGER orders_whatsapp_events
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.orders_whatsapp_events();

-- Le serveur réserve un lot de messages à envoyer (jamais deux fois le même, même avec plusieurs serveurs).
CREATE OR REPLACE FUNCTION public.claim_notifications(p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Trop ancien (serveur arrêté plusieurs heures) : on n'envoie plus.
    UPDATE public.notification_outbox
    SET status = 'expired', last_error = 'Délai dépassé'
    WHERE status = 'pending' AND created_at < now() - interval '12 hours';

    -- Envoi interrompu par un redémarrage du serveur : on réessaie.
    UPDATE public.notification_outbox
    SET status = 'pending'
    WHERE status = 'sending' AND next_attempt_at < now() - interval '5 minutes';

    RETURN QUERY
    UPDATE public.notification_outbox o
    SET status = 'sending', attempts = o.attempts + 1, next_attempt_at = now()
    WHERE o.id IN (
        SELECT q.id FROM public.notification_outbox q
        WHERE q.status = 'pending' AND q.next_attempt_at <= now()
        ORDER BY q.id
        LIMIT greatest(1, least(coalesce(p_limit, 10), 50))
        FOR UPDATE SKIP LOCKED
    )
    RETURNING o.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_notifications(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notifications(INTEGER) TO service_role;

-- ===========================================================================
-- 2. Annuaire public « Boutiques près de moi »
-- ===========================================================================
ALTER TABLE public.merchant_locations ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Le marchand choisit d'apparaître (ou non) dans l'annuaire.
CREATE OR REPLACE FUNCTION public.set_directory_visibility(p_public BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Connexion requise.';
    END IF;
    UPDATE public.merchant_locations SET is_public = coalesce(p_public, false) WHERE merchant_id = auth.uid();
    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Localisez d''abord votre boutique.');
    END IF;
    RETURN json_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.set_directory_visibility(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_directory_visibility(BOOLEAN) TO authenticated;

-- Inscription : la case « Afficher ma boutique dans l'annuaire » (location.public) est prise en compte.
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
    v_public BOOLEAN;
BEGIN
    BEGIN
        v_lat := (NEW.raw_user_meta_data -> 'location' ->> 'lat')::DOUBLE PRECISION;
        v_lng := (NEW.raw_user_meta_data -> 'location' ->> 'lng')::DOUBLE PRECISION;
        v_acc := round((NEW.raw_user_meta_data -> 'location' ->> 'accuracy')::NUMERIC)::INTEGER;
        v_public := coalesce((NEW.raw_user_meta_data -> 'location' ->> 'public')::BOOLEAN, false);
        IF v_lat BETWEEN -90 AND 90 AND v_lng BETWEEN -180 AND 180
           AND EXISTS (SELECT 1 FROM public.merchants WHERE id = NEW.id) THEN
            INSERT INTO public.merchant_locations (merchant_id, latitude, longitude, accuracy_m, source, is_public)
            VALUES (NEW.id, v_lat, v_lng, greatest(v_acc, 0), 'inscription', v_public)
            ON CONFLICT (merchant_id) DO NOTHING;
        END IF;
    EXCEPTION WHEN others THEN
        NULL;
    END;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user_location() FROM PUBLIC, anon, authenticated;

-- Boutiques visibles : localisées, inscrites à l'annuaire, non suspendues, avec au moins un produit.
-- Les boutiques Pro et Premium sont « à la une ».
DROP FUNCTION IF EXISTS public.public_shops_directory();
CREATE FUNCTION public.public_shops_directory()
RETURNS TABLE (
    shop_name TEXT,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    theme_color TEXT,
    featured BOOLEAN,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    products_count BIGINT,
    categories TEXT[],
    min_price_fcfa INTEGER,
    cover_images TEXT[],
    rating NUMERIC,
    reviews_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        m.shop_name::TEXT,
        left(m.description::TEXT, 280),
        m.logo_url::TEXT,
        m.banner_url::TEXT,
        m.theme_color::TEXT,
        (coalesce(m.subscription_plan, 'debutant') IN ('pro', 'premium')
            AND coalesce(m.subscription_status, 'active') = 'active'
            AND (m.subscription_end_date IS NULL OR m.subscription_end_date > now())),
        l.latitude,
        l.longitude,
        p.products_count,
        p.categories,
        p.min_price_fcfa,
        p.cover_images,
        r.rating,
        coalesce(r.reviews_count, 0),
        m.created_at::TIMESTAMP WITH TIME ZONE
    FROM public.merchants m
    JOIN public.merchant_locations l ON l.merchant_id = m.id AND l.is_public
    JOIN LATERAL (
        SELECT
            count(*) AS products_count,
            array_remove(array_agg(DISTINCT pr.category::TEXT), NULL) AS categories,
            min(pr.price_fcfa)::INTEGER AS min_price_fcfa,
            (array_remove(array_agg(pr.image_url::TEXT ORDER BY pr.created_at DESC), NULL))[1:3] AS cover_images
        FROM public.products pr
        WHERE pr.merchant_id = m.id
    ) p ON p.products_count > 0
    LEFT JOIN LATERAL (
        SELECT round(avg(rv.rating)::NUMERIC, 1) AS rating, count(*) AS reviews_count
        FROM public.reviews rv
        JOIN public.products pr ON pr.id = rv.product_id
        WHERE pr.merchant_id = m.id
    ) r ON true
    WHERE NOT coalesce(m.is_suspended, false)
    ORDER BY 6 DESC, m.created_at DESC
    LIMIT 2000;
$$;
REVOKE ALL ON FUNCTION public.public_shops_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_shops_directory() TO anon, authenticated;

-- ===========================================================================
-- 4. Suivi du livreur en direct
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_positions (
    order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    driver_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    accuracy_m INTEGER,
    heading REAL,
    speed_kmh REAL,
    trail JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Positions : marchand ou admin" ON public.delivery_positions;
CREATE POLICY "Positions : marchand ou admin"
    ON public.delivery_positions FOR SELECT TO authenticated
    USING (merchant_id = auth.uid() OR public.is_platform_admin());

-- Le livreur connecté envoie sa position pendant SA course en cours (au plus une fois toutes les 3 s).
DROP FUNCTION IF EXISTS public.update_driver_position(TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, REAL, REAL);
CREATE FUNCTION public.update_driver_position(
    p_token TEXT,
    p_order_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_accuracy_m INTEGER DEFAULT NULL,
    p_heading REAL DEFAULT NULL,
    p_speed_kmh REAL DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.driver_sessions := public.driver_session(p_token);
    v_status order_status;
    v_driver TEXT;
    v_last TIMESTAMP WITH TIME ZONE;
BEGIN
    IF p_latitude IS NULL OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
        RETURN json_build_object('ok', false, 'error', 'Position invalide.');
    END IF;

    SELECT status, driver_name INTO v_status, v_driver
    FROM public.orders
    WHERE id = p_order_id AND merchant_id = v_session.merchant_id;
    IF NOT FOUND OR v_status::TEXT <> 'IN_TRANSIT' OR v_driver IS DISTINCT FROM v_session.driver_name THEN
        RETURN json_build_object('ok', false, 'error', 'Cette course ne vous est pas assignée.');
    END IF;

    SELECT updated_at INTO v_last FROM public.delivery_positions WHERE order_id = p_order_id;
    IF v_last IS NOT NULL AND v_last > now() - interval '3 seconds' THEN
        RETURN json_build_object('ok', true, 'throttled', true);
    END IF;

    INSERT INTO public.delivery_positions AS dp (order_id, merchant_id, driver_name, latitude, longitude, accuracy_m, heading, speed_kmh, trail)
    VALUES (
        p_order_id, v_session.merchant_id, v_session.driver_name, p_latitude, p_longitude,
        greatest(p_accuracy_m, 0), p_heading, greatest(p_speed_kmh, 0),
        jsonb_build_array(jsonb_build_array(round(p_latitude::NUMERIC, 5), round(p_longitude::NUMERIC, 5)))
    )
    ON CONFLICT (order_id) DO UPDATE SET
        driver_name = EXCLUDED.driver_name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy_m = EXCLUDED.accuracy_m,
        heading = EXCLUDED.heading,
        speed_kmh = EXCLUDED.speed_kmh,
        -- Trace : les 60 derniers points seulement.
        trail = (
            SELECT coalesce(jsonb_agg(t.pt ORDER BY t.idx), '[]'::jsonb)
            FROM (
                SELECT e.pt, e.idx
                FROM jsonb_array_elements(dp.trail || EXCLUDED.trail) WITH ORDINALITY AS e(pt, idx)
                ORDER BY e.idx DESC
                LIMIT 60
            ) t
        ),
        updated_at = now();

    -- Nettoyage : les positions ne sont pas conservées au-delà de 2 jours.
    DELETE FROM public.delivery_positions WHERE updated_at < now() - interval '2 days';

    RETURN json_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.update_driver_position(TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, REAL, REAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_driver_position(TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, REAL, REAL) TO anon, authenticated;

-- Reçu / suivi client : pendant la course, téléphone du livreur et position en direct.
CREATE OR REPLACE FUNCTION public.order_receipt(p_order public.orders)
RETURNS JSON
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT json_build_object(
        'id', p_order.id,
        'status', p_order.status,
        'customer_name', p_order.customer_name,
        'customer_phone', p_order.customer_phone,
        'customer_address', p_order.customer_address,
        'delivery_zone', p_order.delivery_zone,
        'total_amount_fcfa', p_order.total_amount_fcfa,
        'cart_items', p_order.cart_items,
        'delivery_pin', p_order.delivery_pin,
        'payment_method', p_order.payment_method,
        'driver_name', p_order.driver_name,
        'created_at', p_order.created_at,
        'driver_phone', CASE WHEN p_order.status::TEXT = 'IN_TRANSIT' THEN (
            SELECT d.phone_number FROM public.drivers d
            WHERE d.merchant_id = p_order.merchant_id AND d.full_name = p_order.driver_name
            LIMIT 1
        ) END,
        'driver_position', CASE WHEN p_order.status::TEXT = 'IN_TRANSIT' THEN (
            SELECT json_build_object(
                'lat', dp.latitude, 'lng', dp.longitude, 'accuracy_m', dp.accuracy_m,
                'heading', dp.heading, 'speed_kmh', dp.speed_kmh, 'trail', dp.trail,
                'updated_at', dp.updated_at
            )
            FROM public.delivery_positions dp
            WHERE dp.order_id = p_order.id AND dp.driver_name = p_order.driver_name
        ) END
    );
$$;
REVOKE ALL ON FUNCTION public.order_receipt(public.orders) FROM PUBLIC, anon, authenticated;
