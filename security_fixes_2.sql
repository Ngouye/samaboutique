-- Fichier : security_fixes_2.sql
-- À exécuter dans l'éditeur SQL de Supabase APRÈS security_fixes.sql,
-- puis déployer aussitôt la nouvelle version du site (les fonctions livreur changent de signature).
-- Remplace fix_driver_gains.sql (inutile de l'exécuter).
--
--  1. Livreurs : session à jeton (12 h) au lieu d'un nom envoyé par le navigateur,
--     connexion et code PIN limités en nombre d'essais, courses limitées à la boutique du livreur.
--  2. Clients : suivi de commande et création de commande via des fonctions dédiées,
--     avec limitation des essais ; la table orders n'est plus lisible publiquement.
--  3. Avis : validation du contenu, limitation des envois, badge « achat vérifié ».
--  4. Administrateur : rôle stocké en base (plus d'email écrit dans le code du site).
--  5. Stockage : chaque marchand ne peut envoyer des images que dans son propre dossier.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_enforce_integrity') THEN
        RAISE EXCEPTION 'Exécutez d''abord security_fixes.sql';
    END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ===========================================================================
-- 0. Outils : adresse IP de l'appelant et limitation des essais
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.security_attempts (
    id BIGSERIAL PRIMARY KEY,
    scope TEXT NOT NULL,
    subject TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_attempts_lookup ON public.security_attempts (scope, subject, created_at DESC);
ALTER TABLE public.security_attempts ENABLE ROW LEVEL SECURITY; -- aucune politique : serveur uniquement

CREATE OR REPLACE FUNCTION public.client_ip()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT coalesce(
        nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
        nullif(trim(split_part(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1)), ''),
        'inconnue'
    );
$$;

CREATE OR REPLACE FUNCTION public.attempts_count(p_scope TEXT, p_subject TEXT, p_window INTERVAL)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT count(*)::INTEGER FROM public.security_attempts
    WHERE scope = p_scope AND subject = p_subject AND created_at > now() - p_window;
$$;

CREATE OR REPLACE FUNCTION public.attempts_log(p_scope TEXT, p_subject TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.security_attempts (scope, subject) VALUES (p_scope, p_subject);
$$;

-- Fonctions internes : jamais appelables depuis le navigateur.
REVOKE ALL ON FUNCTION public.client_ip() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attempts_count(TEXT, TEXT, INTERVAL) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attempts_log(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_role() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 1. Administrateurs de la plateforme
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_admins (user_id)
SELECT id FROM auth.users WHERE email = 'gningngouye2001@gmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins : modifier les marchands" ON public.merchants;
CREATE POLICY "Admins : modifier les marchands"
    ON public.merchants FOR UPDATE TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Abonnement et suspension : le garde-fou (security_fixes.sql) reconnaît automatiquement
-- les administrateurs dès que is_platform_admin() existe.

-- ===========================================================================
-- 2. Livreurs : sessions à jeton
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.driver_sessions (
    token_hash TEXT PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL,
    driver_name TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY; -- aucune politique : serveur uniquement

CREATE OR REPLACE FUNCTION public.driver_session(p_token TEXT)
RETURNS public.driver_sessions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_session public.driver_sessions;
BEGIN
    SELECT * INTO v_session
    FROM public.driver_sessions
    WHERE token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
      AND expires_at > now();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_EXPIREE';
    END IF;
    RETURN v_session;
END;
$$;
REVOKE ALL ON FUNCTION public.driver_session(TEXT) FROM PUBLIC, anon, authenticated;

-- Connexion : renvoie un jeton (valable 12 h). 5 échecs / 15 min par numéro, 20 par adresse IP.
DROP FUNCTION IF EXISTS public.authenticate_driver(TEXT, TEXT, TEXT);
CREATE FUNCTION public.authenticate_driver(p_shop_name TEXT, p_phone TEXT, p_cni TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_merchant_id UUID;
    v_driver_id UUID;
    v_driver_name TEXT;
    v_token TEXT;
    v_subject TEXT := lower(trim(coalesce(p_shop_name, ''))) || ':' || trim(coalesce(p_phone, ''));
    v_ip TEXT := public.client_ip();
BEGIN
    IF public.attempts_count('driver_login', v_subject, interval '15 minutes') >= 5
       OR public.attempts_count('driver_login_ip', v_ip, interval '15 minutes') >= 20 THEN
        RETURN json_build_object('ok', false, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
    END IF;

    -- Comparaison exacte (insensible à la casse) : pas de jokers « % » possibles.
    SELECT m.id INTO v_merchant_id FROM public.merchants m WHERE lower(m.shop_name) = lower(trim(p_shop_name)) LIMIT 1;

    IF v_merchant_id IS NOT NULL THEN
        SELECT d.id, d.full_name INTO v_driver_id, v_driver_name
        FROM public.drivers d
        WHERE d.merchant_id = v_merchant_id
          AND d.phone_number = trim(p_phone)
          AND d.cni_number = trim(p_cni)
        LIMIT 1;
    END IF;

    IF v_driver_id IS NULL THEN
        PERFORM public.attempts_log('driver_login', v_subject);
        PERFORM public.attempts_log('driver_login_ip', v_ip);
        RETURN json_build_object('ok', false, 'error', 'Identifiants incorrects ou non enregistrés.');
    END IF;

    DELETE FROM public.driver_sessions WHERE expires_at < now();
    v_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.driver_sessions (token_hash, driver_id, merchant_id, driver_name, expires_at)
    VALUES (encode(digest(v_token, 'sha256'), 'hex'), v_driver_id, v_merchant_id, v_driver_name, now() + interval '12 hours');

    RETURN json_build_object('ok', true, 'token', v_token, 'name', v_driver_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.logout_driver(p_token TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    DELETE FROM public.driver_sessions WHERE token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- Courses visibles : à prendre (boutique du livreur), SA course en cours, SES livraisons du jour.
-- Le téléphone du client n'est communiqué qu'au livreur qui a accepté la course.
DROP FUNCTION IF EXISTS public.get_driver_orders(TEXT);
DROP FUNCTION IF EXISTS public.get_driver_orders(TEXT, TEXT, TEXT);
CREATE FUNCTION public.get_driver_orders(p_token TEXT)
RETURNS TABLE (
    id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    delivery_zone TEXT,
    total_amount_fcfa INTEGER,
    status order_status,
    cart_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    driver_name TEXT,
    payment_method TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.driver_sessions := public.driver_session(p_token);
    v_day_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now() AT TIME ZONE 'Africa/Dakar') AT TIME ZONE 'Africa/Dakar';
BEGIN
    RETURN QUERY
    SELECT o.id, o.customer_name,
           CASE WHEN o.driver_name = v_session.driver_name THEN o.customer_phone END,
           o.customer_address, o.delivery_zone, o.total_amount_fcfa, o.status, o.cart_items,
           o.created_at, o.driver_name, o.payment_method, o.delivered_at
    FROM public.orders o
    WHERE o.merchant_id = v_session.merchant_id
      AND (
            o.status = 'PREPARING'::order_status
         OR (o.status = 'IN_TRANSIT'::order_status AND o.driver_name = v_session.driver_name)
         OR (o.status = 'DELIVERED'::order_status AND o.driver_name = v_session.driver_name AND o.delivered_at >= v_day_start)
      )
    ORDER BY o.created_at ASC;
END;
$$;

DROP FUNCTION IF EXISTS public.assign_order_to_driver(UUID, TEXT);
DROP FUNCTION IF EXISTS public.assign_order_to_driver(TEXT, UUID);
CREATE FUNCTION public.assign_order_to_driver(p_token TEXT, p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.driver_sessions := public.driver_session(p_token);
    v_status order_status;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.orders
        WHERE merchant_id = v_session.merchant_id AND driver_name = v_session.driver_name AND status = 'IN_TRANSIT'::order_status
    ) THEN
        RAISE EXCEPTION 'Vous avez déjà une course en cours. Veuillez la terminer d''abord.';
    END IF;

    -- Verrou de ligne : deux livreurs ne peuvent pas prendre la même course.
    SELECT status INTO v_status FROM public.orders
    WHERE id = p_order_id AND merchant_id = v_session.merchant_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course introuvable.';
    END IF;
    IF v_status <> 'PREPARING'::order_status THEN
        RAISE EXCEPTION 'Désolé, cette course a déjà été acceptée par un autre livreur.';
    END IF;

    UPDATE public.orders SET status = 'IN_TRANSIT'::order_status, driver_name = v_session.driver_name WHERE id = p_order_id;
    RETURN TRUE;
END;
$$;

-- Validation par code PIN : 5 erreurs / 15 min, blocage définitif après 10 erreurs
-- (la boutique peut alors valider elle-même la livraison depuis son tableau de bord).
DROP FUNCTION IF EXISTS public.mark_order_delivered(UUID);
DROP FUNCTION IF EXISTS public.mark_order_delivered(UUID, TEXT);
DROP FUNCTION IF EXISTS public.mark_order_delivered(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.mark_order_delivered(TEXT, UUID, TEXT);
CREATE FUNCTION public.mark_order_delivered(p_token TEXT, p_order_id UUID, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.driver_sessions := public.driver_session(p_token);
    v_pin TEXT;
    v_status order_status;
    v_driver TEXT;
BEGIN
    SELECT delivery_pin, status, driver_name INTO v_pin, v_status, v_driver
    FROM public.orders
    WHERE id = p_order_id AND merchant_id = v_session.merchant_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course introuvable.';
    END IF;
    IF v_status <> 'IN_TRANSIT'::order_status OR v_driver IS DISTINCT FROM v_session.driver_name THEN
        RAISE EXCEPTION 'Cette course ne vous est pas assignée.';
    END IF;

    IF public.attempts_count('order_pin', p_order_id::TEXT, interval '30 days') >= 10 THEN
        RETURN json_build_object('ok', false, 'error', 'Trop de codes erronés : la boutique doit valider cette livraison.');
    END IF;
    IF public.attempts_count('order_pin', p_order_id::TEXT, interval '15 minutes') >= 5 THEN
        RETURN json_build_object('ok', false, 'error', 'Trop d''essais. Patientez 15 minutes.');
    END IF;

    IF v_pin IS NULL OR v_pin <> trim(coalesce(p_pin, '')) THEN
        PERFORM public.attempts_log('order_pin', p_order_id::TEXT);
        RETURN json_build_object('ok', false, 'error', 'Code incorrect !');
    END IF;

    UPDATE public.orders SET status = 'DELIVERED'::order_status, delivered_at = now() WHERE id = p_order_id;
    RETURN json_build_object('ok', true);
END;
$$;

-- ===========================================================================
-- 3. Clients : commande, reçu et suivi sans accès direct à la table
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.order_receipt(p_order public.orders)
RETURNS JSON
LANGUAGE sql
STABLE
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
        'created_at', p_order.created_at
    );
$$;
REVOKE ALL ON FUNCTION public.order_receipt(public.orders) FROM PUBLIC, anon, authenticated;

-- Commande payée à la livraison. Le total est recalculé par le trigger orders_enforce_integrity.
CREATE OR REPLACE FUNCTION public.place_order(
    p_merchant_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_delivery_zone TEXT,
    p_cart_items JSONB,
    p_delivery_pin TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ip TEXT := public.client_ip();
    v_order public.orders;
BEGIN
    IF public.attempts_count('order_ip', v_ip, interval '1 hour') >= 20 THEN
        RAISE EXCEPTION 'Trop de commandes en peu de temps. Réessayez plus tard.';
    END IF;
    IF length(trim(coalesce(p_customer_name, ''))) NOT BETWEEN 2 AND 120
       OR length(trim(coalesce(p_customer_phone, ''))) NOT BETWEEN 6 AND 40
       OR length(trim(coalesce(p_customer_address, ''))) NOT BETWEEN 2 AND 600 THEN
        RAISE EXCEPTION 'Coordonnées invalides.';
    END IF;

    INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone,
                               total_amount_fcfa, cart_items, delivery_pin, payment_method, status)
    VALUES (p_merchant_id, trim(p_customer_name), trim(p_customer_phone), trim(p_customer_address), p_delivery_zone,
            0, p_cart_items, p_delivery_pin, 'ON_DELIVERY', 'PENDING'::order_status)
    RETURNING * INTO v_order;

    PERFORM public.attempts_log('order_ip', v_ip);
    RETURN public.order_receipt(v_order);
END;
$$;

-- Reçu après le retour de paiement PayDunya (identifiant non devinable, commandes de moins de 24 h).
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
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND created_at > now() - interval '24 hours';
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    RETURN public.order_receipt(v_order);
END;
$$;

-- Suivi par téléphone + code PIN : 5 erreurs / 15 min par numéro, 30 par adresse IP.
CREATE OR REPLACE FUNCTION public.track_order(p_phone TEXT, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phone TEXT := trim(coalesce(p_phone, ''));
    v_ip TEXT := public.client_ip();
    v_order public.orders;
BEGIN
    IF public.attempts_count('track', v_phone, interval '15 minutes') >= 5
       OR public.attempts_count('track_ip', v_ip, interval '15 minutes') >= 30 THEN
        RETURN json_build_object('ok', false, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
    END IF;

    SELECT * INTO v_order FROM public.orders
    WHERE customer_phone = v_phone AND delivery_pin = upper(trim(coalesce(p_pin, '')))
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        PERFORM public.attempts_log('track', v_phone);
        PERFORM public.attempts_log('track_ip', v_ip);
        RETURN json_build_object('ok', false, 'error', 'Commande introuvable ou code PIN incorrect');
    END IF;

    RETURN json_build_object('ok', true, 'order', public.order_receipt(v_order));
END;
$$;

-- ===========================================================================
-- 4. Avis clients
-- ===========================================================================
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.submit_review(
    p_product_id UUID,
    p_rating INTEGER,
    p_comment TEXT,
    p_customer_name TEXT,
    p_order_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ip TEXT := public.client_ip();
    v_comment TEXT := trim(coalesce(p_comment, ''));
    v_name TEXT := left(coalesce(nullif(trim(p_customer_name), ''), 'Client anonyme'), 80);
    v_verified BOOLEAN := false;
BEGIN
    IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
        RETURN json_build_object('ok', false, 'error', 'Note invalide.');
    END IF;
    IF length(v_comment) NOT BETWEEN 3 AND 1000 THEN
        RETURN json_build_object('ok', false, 'error', 'Le commentaire doit contenir entre 3 et 1000 caractères.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
        RETURN json_build_object('ok', false, 'error', 'Produit introuvable.');
    END IF;
    IF public.attempts_count('review_ip', v_ip, interval '1 hour') >= 3 THEN
        RETURN json_build_object('ok', false, 'error', 'Vous avez déjà publié plusieurs avis. Réessayez plus tard.');
    END IF;
    IF public.attempts_count('review_product', p_product_id::TEXT, interval '1 day') >= 30 THEN
        RETURN json_build_object('ok', false, 'error', 'Trop d''avis aujourd''hui pour ce produit. Réessayez demain.');
    END IF;

    -- « Achat vérifié » : la commande est livrée et contient bien ce produit.
    IF p_order_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = p_order_id
              AND o.status = 'DELIVERED'::order_status
              AND o.cart_items @> jsonb_build_array(jsonb_build_object('product_id', p_product_id))
        ) INTO v_verified;
    END IF;

    INSERT INTO public.reviews (product_id, order_id, rating, comment, customer_name, verified)
    VALUES (p_product_id, CASE WHEN v_verified THEN p_order_id END, p_rating, v_comment, v_name, v_verified);

    PERFORM public.attempts_log('review_ip', v_ip);
    PERFORM public.attempts_log('review_product', p_product_id::TEXT);
    RETURN json_build_object('ok', true);
END;
$$;

-- ===========================================================================
-- 5. Fermer les accès publics directs (commandes et avis)
--    Supprime les politiques « ouvertes à tous » (USING true / WITH CHECK true).
--    Les politiques des marchands (auth.uid() = merchant_id) sont conservées.
-- ===========================================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename, cmd
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
                (tablename = 'orders' AND (
                    (cmd IN ('SELECT', 'ALL') AND qual = 'true')
                    OR (cmd IN ('INSERT', 'ALL') AND with_check = 'true')
                    OR (cmd IN ('UPDATE', 'DELETE') AND qual = 'true')
                ))
             OR (tablename = 'reviews' AND cmd IN ('INSERT', 'ALL') AND with_check = 'true')
          )
    LOOP
        RAISE NOTICE 'Suppression de la politique publique « % » sur % (%)', pol.policyname, pol.tablename, pol.cmd;
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ===========================================================================
-- 6. Stockage : chaque marchand écrit uniquement dans son dossier ({user_id}/...)
-- ===========================================================================
DROP POLICY IF EXISTS "Ajout d'images par les marchands" ON storage.objects;
DROP POLICY IF EXISTS "Marchands : images dans leur dossier" ON storage.objects;
CREATE POLICY "Marchands : images dans leur dossier"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- ===========================================================================
-- 7. Droits d'exécution des fonctions publiques
-- ===========================================================================
GRANT EXECUTE ON FUNCTION public.authenticate_driver(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.logout_driver(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_orders(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_to_driver(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_delivered(TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_receipt(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(UUID, INTEGER, TEXT, TEXT, UUID) TO anon, authenticated;
