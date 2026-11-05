-- Fichier : security_fixes_3.sql
-- ⚠️ Déployez D'ABORD la nouvelle version du site, PUIS exécutez ce script dans l'éditeur SQL
-- de Supabase (après security_fixes.sql, security_fixes_2.sql, admin_locations.sql et new_features.sql).
-- Le script peut être relancé sans risque.
--
--  1. Marchands : seules les informations affichées sur la vitrine restent publiques.
--     Numéros de reversement, échéances d'abonnement et réglages ne sont plus lisibles par les visiteurs.
--  2. Avis clients : l'identifiant de commande n'est plus public.
--  3. Reçu après paiement : limité aux paiements en ligne de moins de 2 heures.
--  4. Visiteurs anonymes : aucun accès direct aux tables sensibles (commandes, livreurs…).
--     Ils passent uniquement par les fonctions prévues (commander, suivre, se connecter comme livreur).
--  5. Administrateur : la double authentification (code à 6 chiffres) est obligatoire pour lire
--     ou modifier les données de la plateforme.

DO $$
BEGIN
    IF to_regprocedure('public.is_platform_admin()') IS NULL OR to_regclass('public.merchant_locations') IS NULL THEN
        RAISE EXCEPTION 'Exécutez d''abord security_fixes.sql, security_fixes_2.sql puis admin_locations.sql';
    END IF;
END $$;

-- ===========================================================================
-- 1. Marchands : colonnes publiques uniquement
-- ===========================================================================
DO $$
DECLARE
    v_public TEXT[] := ARRAY[
        'id', 'shop_name', 'phone_number', 'email', 'address', 'logo_url', 'banner_url', 'description',
        'theme_color', 'layout_style', 'social_links', 'delivery_zones', 'subscription_plan', 'is_suspended', 'created_at'
    ];
    v_cols TEXT;
BEGIN
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'merchants' AND column_name = ANY (v_public);

    -- Retirer le droit de lecture sur toute la table retire aussi les droits par colonne : on les redonne ensuite.
    REVOKE SELECT ON public.merchants FROM anon, authenticated;
    EXECUTE format('GRANT SELECT (%s) ON public.merchants TO anon, authenticated', v_cols);

    -- Les fiches marchands sont créées par le trigger d'inscription et ne se suppriment pas depuis le site.
    REVOKE INSERT, DELETE ON public.merchants FROM anon, authenticated;
    REVOKE UPDATE ON public.merchants FROM anon;
END $$;

-- Le marchand connecté lit sa fiche complète (paramètres, reversement, abonnement).
CREATE OR REPLACE FUNCTION public.get_my_merchant()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT row_to_json(m) FROM public.merchants m WHERE m.id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_merchant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_merchant() TO authenticated;

-- ===========================================================================
-- 2. Avis clients : sans l'identifiant de commande
-- ===========================================================================
DO $$
DECLARE
    v_cols TEXT;
BEGIN
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name <> 'order_id';

    REVOKE SELECT ON public.reviews FROM anon, authenticated;
    EXECUTE format('GRANT SELECT (%s) ON public.reviews TO anon, authenticated', v_cols);
    -- Les avis sont publiés uniquement par submit_review (contrôles et limites).
    REVOKE INSERT, UPDATE ON public.reviews FROM anon, authenticated;
END $$;

-- ===========================================================================
-- 3. Reçu après paiement en ligne (retour de PayDunya)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.get_order_receipt(p_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders;
BEGIN
    SELECT * INTO v_order FROM public.orders
    WHERE id = p_order_id
      AND payment_method = 'MOBILE_MONEY'
      AND created_at > now() - interval '2 hours';
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    RETURN public.order_receipt(v_order);
END;
$$;

-- ===========================================================================
-- 4. Visiteurs anonymes : pas d'accès direct aux tables sensibles
-- ===========================================================================
DO $$
DECLARE
    v_table TEXT;
    pol RECORD;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'orders', 'drivers', 'driver_sessions', 'security_attempts', 'platform_admins', 'subscription_payments',
        'merchant_locations', 'notification_outbox', 'delivery_positions', 'ai_usage'
    ] LOOP
        IF to_regclass('public.' || v_table) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON public.%I FROM anon', v_table);
        END IF;
    END LOOP;

    -- Politiques « ouvertes à tous » sur les livreurs (CNI, téléphone) : supprimées si elles existent.
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'drivers' AND cmd IN ('SELECT', 'ALL') AND qual = 'true'
    LOOP
        RAISE NOTICE 'Suppression de la politique publique « % » sur drivers', pol.policyname;
        EXECUTE format('DROP POLICY %I ON public.drivers', pol.policyname);
    END LOOP;
END $$;

-- ===========================================================================
-- 5. Administrateur : double authentification obligatoire
-- ===========================================================================
-- Compte administrateur (sert à afficher l'écran de double authentification).
CREATE OR REPLACE FUNCTION public.is_platform_admin_account()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin_account() TO authenticated;

-- Accès aux données : administrateur ET session validée par le code à 6 chiffres (niveau « aal2 »).
-- Toutes les fonctions et politiques réservées à l'admin s'appuient sur cette fonction.
-- En cas de perte du téléphone : supprimez le facteur dans Supabase (Authentication → Users → MFA).
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
       AND coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal', '') = 'aal2';
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
