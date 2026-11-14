-- =====================================================================
-- Produits : brouillons, publication programmée et mise en ligne
-- ---------------------------------------------------------------------
-- Le commerçant peut enregistrer un produit sans le montrer (brouillon), le publier quand il
-- est prêt, ou programmer sa mise en ligne à une date et une heure précises.
--
--  · Les clients ne voient que les produits en ligne : la règle d'accès de la base filtre
--    les brouillons et les produits programmés dont l'heure n'est pas arrivée.
--  · Une commande contenant un produit qui n'est pas en vente est refusée.
--  · L'annuaire « Boutiques près de moi » ne compte que les produits en ligne.
--  · Les produits existants restent en ligne : rien ne change pour eux.
--
-- À exécuter une fois dans Supabase : SQL Editor → coller ce fichier → Run.
-- Après stock_et_annuaire.sql. Le script peut être relancé sans risque.
-- =====================================================================

DO $$
BEGIN
    IF to_regprocedure('public.order_quantities(jsonb)') IS NULL
       OR to_regprocedure('public.public_shops_directory()') IS NULL THEN
        RAISE EXCEPTION 'Exécutez d''abord stock_et_annuaire.sql';
    END IF;
END $$;

-- 1. Visibilité des produits ------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_visibility_check') THEN
        ALTER TABLE public.products ADD CONSTRAINT products_visibility_check
            CHECK (visibility IN ('draft', 'scheduled', 'published'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_schedule_check') THEN
        ALTER TABLE public.products ADD CONSTRAINT products_schedule_check
            CHECK (visibility <> 'scheduled' OR publish_at IS NOT NULL);
    END IF;
END $$;

-- Date de mise en ligne des produits déjà publiés
UPDATE public.products SET published_at = created_at WHERE visibility = 'published' AND published_at IS NULL;

-- Produit visible par les clients : publié, ou programmé et l'heure est arrivée.
CREATE OR REPLACE FUNCTION public.product_is_live(p_visibility TEXT, p_publish_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT coalesce(p_visibility, 'published') = 'published'
        OR (p_visibility = 'scheduled' AND p_publish_at IS NOT NULL AND p_publish_at <= now());
$$;
GRANT EXECUTE ON FUNCTION public.product_is_live(TEXT, TIMESTAMP WITH TIME ZONE) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS products_merchant_visibility_idx ON public.products (merchant_id, visibility);

-- 2. Lecture publique : seulement les produits en ligne -------------------------------------
-- Les anciennes règles « tout le monde voit tous les produits » sont retirées. Le commerçant
-- continue de voir et de gérer tous ses produits grâce à sa propre règle (auth.uid() = merchant_id).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'products'
          AND cmd = 'SELECT' AND (qual IS NULL OR btrim(qual) IN ('true', '(true)'))
    LOOP
        EXECUTE format('DROP POLICY %I ON public.products', r.policyname);
        RAISE NOTICE 'Règle retirée : %', r.policyname;
    END LOOP;
END $$;

DROP POLICY IF EXISTS "Produits en ligne visibles par tous" ON public.products;
CREATE POLICY "Produits en ligne visibles par tous"
ON public.products FOR SELECT
USING (public.product_is_live(visibility, publish_at));

-- 3. Commandes : un produit qui n'est pas en vente ne peut pas être commandé -----------------
-- Déclencheur nommé pour passer après orders_enforce_integrity (panier déjà vérifié) et avant
-- orders_reserve_stock (ordre alphabétique des déclencheurs BEFORE de PostgreSQL).
CREATE OR REPLACE FUNCTION public.orders_ensure_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT p.name INTO v_name
    FROM public.order_quantities(NEW.cart_items) q
    JOIN public.products p ON p.id = q.product_id AND p.merchant_id = NEW.merchant_id
    WHERE NOT public.product_is_live(p.visibility, p.publish_at)
    LIMIT 1;

    IF v_name IS NOT NULL THEN
        RAISE EXCEPTION 'Désolé, « % » n''est plus en vente. Retirez-le du panier pour continuer.', v_name;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.orders_ensure_published() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_ensure_published ON public.orders;
CREATE TRIGGER orders_ensure_published
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.orders_ensure_published();

-- 4. Annuaire « Boutiques près de moi » : seulement les produits en ligne ---------------------
CREATE OR REPLACE FUNCTION public.public_shops_directory()
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
    created_at TIMESTAMP WITH TIME ZONE,
    phone_number TEXT,
    address TEXT
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
        m.created_at::TIMESTAMP WITH TIME ZONE,
        nullif(trim(m.phone_number::TEXT), ''),
        nullif(left(trim(m.address::TEXT), 160), '')
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
          AND public.product_is_live(pr.visibility, pr.publish_at)
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
