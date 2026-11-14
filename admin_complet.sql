-- =====================================================================
-- Administration complète de la plateforme
-- ---------------------------------------------------------------------
-- Fonctions réservées à l'administrateur (compte de platform_admins, connecté
-- avec la double authentification) : commandes, clients, produits, livreurs,
-- avis, paiements d'abonnement, santé du système, changement d'offre et
-- suspension d'une boutique, avec un journal de chaque action.
--
-- Lecture seule pour tout ce qui est consultation. Les seules écritures sont :
-- changer l'offre d'une boutique, la suspendre / la réactiver, supprimer un avis
-- (chacune notée dans le journal admin_audit_log).
--
-- À exécuter une fois dans Supabase : SQL Editor → coller ce fichier → Run.
-- Après admin_locations.sql et security_fixes_3.sql. Peut être relancé sans risque.
-- =====================================================================

DO $$
BEGIN
    IF to_regprocedure('public.is_platform_admin()') IS NULL
       OR to_regprocedure('public.admin_merchants_overview()') IS NULL THEN
        RAISE EXCEPTION 'Exécutez d''abord admin_locations.sql et security_fixes_3.sql';
    END IF;
END $$;

-- Journal des actions de l'administrateur ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id UUID,
    action TEXT NOT NULL,
    target TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Aucune règle d'accès : seules les fonctions ci-dessous (SECURITY DEFINER) y lisent et écrivent.
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS admin_audit_log_created ON public.admin_audit_log (created_at DESC);

-- Numéro de client comparable (chiffres seuls, sans +221 ni 00221)
CREATE OR REPLACE FUNCTION public.admin_phone_key(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE WHEN length(d) = 12 AND d LIKE '221%' THEN substr(d, 4) ELSE d END
    FROM (SELECT regexp_replace(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '^00', '') AS d) AS s;
$$;
REVOKE ALL ON FUNCTION public.admin_phone_key(TEXT) FROM PUBLIC, anon, authenticated;

-- Garde commune
CREATE OR REPLACE FUNCTION public.admin_require()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Accès réservé à l''administrateur de la plateforme.';
    END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_require() FROM PUBLIC, anon, authenticated;

-- 1. Commandes de toute la plateforme ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_orders(p_days INTEGER DEFAULT 365)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    merchant_id UUID,
    shop_name TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_key TEXT,
    customer_address TEXT,
    delivery_zone TEXT,
    total_amount_fcfa INTEGER,
    status TEXT,
    payment_method TEXT,
    payment_channel TEXT,
    payment_status TEXT,
    driver_name TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    items_count INTEGER,
    cart_items JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_days INTEGER := least(greatest(coalesce(p_days, 365), 1), 3650);
BEGIN
    PERFORM public.admin_require();
    RETURN QUERY
    SELECT
        o.id,
        o.created_at::TIMESTAMP WITH TIME ZONE,
        o.merchant_id,
        m.shop_name::TEXT,
        o.customer_name::TEXT,
        o.customer_phone::TEXT,
        public.admin_phone_key(o.customer_phone::TEXT),
        o.customer_address::TEXT,
        o.delivery_zone::TEXT,
        o.total_amount_fcfa::INTEGER,
        o.status::TEXT,
        coalesce(x.j ->> 'payment_method', 'ON_DELIVERY'),
        x.j ->> 'payment_channel',
        x.j ->> 'payment_status',
        x.j ->> 'driver_name',
        (x.j ->> 'delivered_at')::TIMESTAMP WITH TIME ZONE,
        (SELECT coalesce(sum(coalesce((i ->> 'quantity')::INTEGER, 1)), 0)::INTEGER
           FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.cart_items) = 'array' THEN o.cart_items ELSE '[]'::jsonb END) i),
        o.cart_items
    FROM public.orders o
    CROSS JOIN LATERAL (SELECT to_jsonb(o) AS j) x
    LEFT JOIN public.merchants m ON m.id = o.merchant_id
    WHERE o.created_at >= now() - make_interval(days => v_days)
    ORDER BY o.created_at DESC
    LIMIT 5000;
END;
$$;

-- 2. Clients (regroupés par numéro de téléphone, toutes boutiques confondues) -----------------
CREATE OR REPLACE FUNCTION public.admin_customers()
RETURNS TABLE (
    customer_key TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    orders_count BIGINT,
    delivered_count BIGINT,
    cancelled_count BIGINT,
    total_spent_fcfa BIGINT,
    shops_count BIGINT,
    shops TEXT[],
    zones TEXT[],
    first_order_at TIMESTAMP WITH TIME ZONE,
    last_order_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    PERFORM public.admin_require();
    RETURN QUERY
    WITH o AS (
        SELECT od.*, public.admin_phone_key(od.customer_phone::TEXT) AS k, m.shop_name::TEXT AS shop
        FROM public.orders od
        LEFT JOIN public.merchants m ON m.id = od.merchant_id
    )
    SELECT
        o.k,
        (array_agg(o.customer_name::TEXT ORDER BY o.created_at DESC))[1],
        (array_agg(o.customer_phone::TEXT ORDER BY o.created_at DESC))[1],
        count(*),
        count(*) FILTER (WHERE o.status::TEXT = 'DELIVERED'),
        count(*) FILTER (WHERE o.status::TEXT = 'CANCELLED'),
        coalesce(sum(o.total_amount_fcfa) FILTER (WHERE o.status::TEXT = 'DELIVERED'), 0)::BIGINT,
        count(DISTINCT o.merchant_id),
        (array_remove(array_agg(DISTINCT o.shop), NULL))[1:5],
        (array_remove(array_agg(DISTINCT o.delivery_zone::TEXT), NULL))[1:5],
        min(o.created_at)::TIMESTAMP WITH TIME ZONE,
        max(o.created_at)::TIMESTAMP WITH TIME ZONE
    FROM o
    WHERE o.k <> ''
    GROUP BY o.k
    ORDER BY max(o.created_at) DESC
    LIMIT 10000;
END;
$$;

-- 3. Produits de toutes les boutiques, avec leurs ventes livrées --------------------------------
CREATE OR REPLACE FUNCTION public.admin_products()
RETURNS TABLE (
    id UUID,
    merchant_id UUID,
    shop_name TEXT,
    name TEXT,
    category TEXT,
    price_fcfa INTEGER,
    stock INTEGER,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    visibility TEXT,
    publish_at TIMESTAMP WITH TIME ZONE,
    units_sold BIGINT,
    revenue_fcfa BIGINT,
    rating NUMERIC,
    reviews_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    PERFORM public.admin_require();
    RETURN QUERY
    WITH sold AS (
        SELECT (i ->> 'product_id')::UUID AS pid,
               sum(coalesce((i ->> 'quantity')::INTEGER, 1)) AS units,
               sum(coalesce((i ->> 'quantity')::INTEGER, 1) * coalesce((i ->> 'price')::NUMERIC, 0)) AS rev
        FROM public.orders o,
             jsonb_array_elements(CASE WHEN jsonb_typeof(o.cart_items) = 'array' THEN o.cart_items ELSE '[]'::jsonb END) i
        WHERE o.status::TEXT = 'DELIVERED'
          AND (i ->> 'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        GROUP BY 1
    ),
    rv AS (
        SELECT r.product_id, round(avg(r.rating)::NUMERIC, 1) AS rating, count(*) AS n
        FROM public.reviews r
        GROUP BY 1
    )
    SELECT
        p.id,
        p.merchant_id,
        m.shop_name::TEXT,
        p.name::TEXT,
        p.category::TEXT,
        p.price_fcfa::INTEGER,
        p.stock::INTEGER,
        p.image_url::TEXT,
        p.created_at::TIMESTAMP WITH TIME ZONE,
        coalesce(x.j ->> 'visibility', 'published'),
        (x.j ->> 'publish_at')::TIMESTAMP WITH TIME ZONE,
        coalesce(s.units, 0)::BIGINT,
        coalesce(s.rev, 0)::BIGINT,
        rv.rating,
        coalesce(rv.n, 0)::BIGINT
    FROM public.products p
    CROSS JOIN LATERAL (SELECT to_jsonb(p) AS j) x
    LEFT JOIN public.merchants m ON m.id = p.merchant_id
    LEFT JOIN sold s ON s.pid = p.id
    LEFT JOIN rv ON rv.product_id = p.id
    ORDER BY coalesce(s.units, 0) DESC, p.created_at DESC
    LIMIT 10000;
END;
$$;

-- 4. Livreurs de toutes les boutiques ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_drivers()
RETURNS TABLE (
    id UUID,
    merchant_id UUID,
    shop_name TEXT,
    full_name TEXT,
    phone_number TEXT,
    vehicle_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    delivered_count BIGINT,
    in_transit_count BIGINT,
    cash_collected_fcfa BIGINT,
    last_delivery_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    PERFORM public.admin_require();
    RETURN QUERY
    SELECT
        d.id,
        d.merchant_id,
        m.shop_name::TEXT,
        d.full_name::TEXT,
        d.phone_number::TEXT,
        d.vehicle_type::TEXT,
        d.created_at::TIMESTAMP WITH TIME ZONE,
        coalesce(x.delivered, 0)::BIGINT,
        coalesce(x.transit, 0)::BIGINT,
        coalesce(x.cash, 0)::BIGINT,
        x.last_at
    FROM public.drivers d
    LEFT JOIN public.merchants m ON m.id = d.merchant_id
    LEFT JOIN LATERAL (
        SELECT
            count(*) FILTER (WHERE o.status::TEXT = 'DELIVERED') AS delivered,
            count(*) FILTER (WHERE o.status::TEXT = 'IN_TRANSIT') AS transit,
            sum(o.total_amount_fcfa) FILTER (WHERE o.status::TEXT = 'DELIVERED'
                AND coalesce(to_jsonb(o) ->> 'payment_method', 'ON_DELIVERY') <> 'MOBILE_MONEY') AS cash,
            max((to_jsonb(o) ->> 'delivered_at')::TIMESTAMP WITH TIME ZONE) AS last_at
        FROM public.orders o
        WHERE o.merchant_id = d.merchant_id
          AND (to_jsonb(o) ->> 'driver_name') = d.full_name
    ) x ON true
    ORDER BY coalesce(x.delivered, 0) DESC, d.created_at DESC;
END;
$$;

-- 5. Avis clients et modération ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reviews()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    rating INTEGER,
    comment TEXT,
    customer_name TEXT,
    verified BOOLEAN,
    product_id UUID,
    product_name TEXT,
    merchant_id UUID,
    shop_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    PERFORM public.admin_require();
    RETURN QUERY
    SELECT
        r.id,
        r.created_at::TIMESTAMP WITH TIME ZONE,
        r.rating::INTEGER,
        r.comment::TEXT,
        r.customer_name::TEXT,
        coalesce((to_jsonb(r) ->> 'verified')::BOOLEAN, false),
        p.id,
        p.name::TEXT,
        p.merchant_id,
        m.shop_name::TEXT
    FROM public.reviews r
    LEFT JOIN public.products p ON p.id = r.product_id
    LEFT JOIN public.merchants m ON m.id = p.merchant_id
    ORDER BY r.created_at DESC
    LIMIT 5000;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_review(p_review_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_review RECORD;
BEGIN
    PERFORM public.admin_require();
    SELECT r.id, r.rating, r.comment, r.customer_name, r.product_id INTO v_review FROM public.reviews r WHERE r.id = p_review_id;
    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Avis introuvable.');
    END IF;
    DELETE FROM public.reviews WHERE id = p_review_id;
    INSERT INTO public.admin_audit_log (admin_id, action, target, details)
    VALUES (auth.uid(), 'review_deleted', p_review_id::TEXT,
            jsonb_build_object('rating', v_review.rating, 'comment', left(coalesce(v_review.comment, ''), 280),
                               'customer_name', v_review.customer_name, 'product_id', v_review.product_id));
    RETURN json_build_object('ok', true);
END;
$$;

-- 6. Paiements d'abonnement reçus (PayDunya) ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_subscription_payments()
RETURNS TABLE (
    invoice_token TEXT,
    merchant_id UUID,
    shop_name TEXT,
    plan TEXT,
    amount_fcfa INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.admin_require();
    IF to_regclass('public.subscription_payments') IS NULL THEN
        RETURN;
    END IF;
    RETURN QUERY EXECUTE
        'SELECT sp.invoice_token::TEXT, sp.merchant_id, m.shop_name::TEXT, sp.plan::TEXT, sp.amount_fcfa::INTEGER, sp.created_at::TIMESTAMP WITH TIME ZONE
         FROM public.subscription_payments sp
         LEFT JOIN public.merchants m ON m.id = sp.merchant_id
         ORDER BY sp.created_at DESC
         LIMIT 5000';
END;
$$;

-- 7. Santé de la plateforme : WhatsApp, assistant IA, sécurité, journal ------------------------
CREATE OR REPLACE FUNCTION public.admin_platform_health()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB := '{}'::jsonb;
    v_part JSONB;
BEGIN
    PERFORM public.admin_require();

    IF to_regclass('public.notification_outbox') IS NOT NULL THEN
        EXECUTE $q$
            SELECT jsonb_build_object(
                'by_status', coalesce((SELECT jsonb_object_agg(s.status, s.n) FROM (
                    SELECT n.status, count(*) AS n FROM public.notification_outbox n
                    WHERE n.created_at > now() - interval '30 days' GROUP BY n.status) s), '{}'::jsonb),
                'recent_failures', coalesce((SELECT jsonb_agg(f) FROM (
                    SELECT n.id, n.event, n.status, n.attempts, left(coalesce(n.last_error, ''), 200) AS last_error,
                           n.created_at, m.shop_name
                    FROM public.notification_outbox n
                    LEFT JOIN public.merchants m ON m.id = n.merchant_id
                    WHERE n.status IN ('failed', 'expired')
                    ORDER BY n.created_at DESC LIMIT 12) f), '[]'::jsonb)
            )
        $q$ INTO v_part;
        v_result := v_result || jsonb_build_object('whatsapp', v_part);
    END IF;

    IF to_regclass('public.ai_usage') IS NOT NULL THEN
        EXECUTE $q$
            SELECT jsonb_build_object(
                'by_kind', coalesce((SELECT jsonb_object_agg(s.kind, s.n) FROM (
                    SELECT a.kind, count(*) AS n FROM public.ai_usage a
                    WHERE a.created_at > now() - interval '30 days' GROUP BY a.kind) s), '{}'::jsonb),
                'top_shops', coalesce((SELECT jsonb_agg(t) FROM (
                    SELECT m.shop_name, count(*) AS n FROM public.ai_usage a
                    LEFT JOIN public.merchants m ON m.id = a.merchant_id
                    WHERE a.created_at > now() - interval '30 days'
                    GROUP BY m.shop_name ORDER BY count(*) DESC LIMIT 8) t), '[]'::jsonb)
            )
        $q$ INTO v_part;
        v_result := v_result || jsonb_build_object('ai', v_part);
    END IF;

    IF to_regclass('public.security_attempts') IS NOT NULL THEN
        EXECUTE $q$
            SELECT coalesce(jsonb_object_agg(s.scope, s.n), '{}'::jsonb) FROM (
                SELECT a.scope, count(*) AS n FROM public.security_attempts a
                WHERE a.created_at > now() - interval '24 hours' GROUP BY a.scope) s
        $q$ INTO v_part;
        v_result := v_result || jsonb_build_object('security_24h', v_part);
    END IF;

    v_result := v_result || jsonb_build_object('audit', coalesce((
        SELECT jsonb_agg(l) FROM (
            SELECT a.id, a.action, a.target, a.details, a.created_at, u.email AS admin_email
            FROM public.admin_audit_log a
            LEFT JOIN auth.users u ON u.id = a.admin_id
            ORDER BY a.created_at DESC LIMIT 30) l), '[]'::jsonb));

    RETURN v_result::JSON;
END;
$$;

-- 8. Offre d'une boutique : changer de forfait ou prolonger -------------------------------------
-- p_months : durée ajoutée à partir de la fin actuelle (ou d'aujourd'hui si elle est passée).
-- Forfait « debutant » : gratuit, sans date de fin.
CREATE OR REPLACE FUNCTION public.admin_set_subscription(p_merchant_id UUID, p_plan TEXT, p_months INTEGER DEFAULT 1)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_before RECORD;
    v_end TIMESTAMP WITH TIME ZONE;
BEGIN
    PERFORM public.admin_require();
    IF p_plan NOT IN ('debutant', 'pro', 'premium') THEN
        RETURN json_build_object('ok', false, 'error', 'Forfait inconnu.');
    END IF;
    IF p_plan <> 'debutant' AND (p_months IS NULL OR p_months NOT BETWEEN 1 AND 24) THEN
        RETURN json_build_object('ok', false, 'error', 'Durée : de 1 à 24 mois.');
    END IF;

    SELECT m.subscription_plan, m.subscription_status, m.subscription_end_date INTO v_before
    FROM public.merchants m WHERE m.id = p_merchant_id;
    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Boutique introuvable.');
    END IF;

    v_end := CASE WHEN p_plan = 'debutant' THEN NULL
                  ELSE greatest(coalesce(v_before.subscription_end_date, now()), now()) + make_interval(months => p_months) END;

    UPDATE public.merchants
    SET subscription_plan = p_plan, subscription_status = 'active', subscription_end_date = v_end
    WHERE id = p_merchant_id;

    INSERT INTO public.admin_audit_log (admin_id, action, target, details)
    VALUES (auth.uid(), 'subscription_changed', p_merchant_id::TEXT,
            jsonb_build_object('from_plan', v_before.subscription_plan, 'from_end', v_before.subscription_end_date,
                               'to_plan', p_plan, 'to_end', v_end, 'months', p_months));

    RETURN json_build_object('ok', true, 'plan', p_plan, 'subscription_end_date', v_end);
END;
$$;

-- 9. Suspendre / réactiver une boutique (avec journal) ------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_suspension(p_merchant_id UUID, p_suspended BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.admin_require();
    UPDATE public.merchants SET is_suspended = coalesce(p_suspended, false) WHERE id = p_merchant_id;
    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Boutique introuvable.');
    END IF;
    INSERT INTO public.admin_audit_log (admin_id, action, target, details)
    VALUES (auth.uid(), CASE WHEN p_suspended THEN 'merchant_suspended' ELSE 'merchant_restored' END,
            p_merchant_id::TEXT, jsonb_build_object('reason', left(coalesce(p_reason, ''), 280)));
    RETURN json_build_object('ok', true);
END;
$$;

-- Droits : réservé aux comptes connectés (la fonction vérifie ensuite qu'il s'agit de l'administrateur)
DO $$
DECLARE
    f TEXT;
BEGIN
    FOREACH f IN ARRAY ARRAY[
        'public.admin_orders(integer)', 'public.admin_customers()', 'public.admin_products()', 'public.admin_drivers()',
        'public.admin_reviews()', 'public.admin_delete_review(uuid)', 'public.admin_subscription_payments()',
        'public.admin_platform_health()', 'public.admin_set_subscription(uuid, text, integer)',
        'public.admin_set_suspension(uuid, boolean, text)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    END LOOP;
END $$;
