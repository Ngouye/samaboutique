-- Fichier : stock_et_annuaire.sql
-- ⚠️ Déployez D'ABORD la nouvelle version du site et du serveur, PUIS exécutez ce script dans l'éditeur SQL
-- de Supabase (après security_fixes.sql, security_fixes_2.sql, admin_locations.sql, new_features.sql
-- et security_fixes_3.sql). Le script peut être relancé sans risque.
--
--  1. Stock : chaque commande fait baisser le stock des produits commandés.
--     - Paiement à la livraison : le stock baisse dès la commande. Une commande qui dépasse le stock
--       est refusée avec un message clair (« Il ne reste que 2 exemplaires de … »).
--     - Wave / Orange Money : le stock est vérifié à la commande, puis baisse quand le paiement est
--       confirmé. Un paiement abandonné ne bloque donc pas le stock.
--     - Commande annulée : le stock est rendu. Commande réactivée : il baisse de nouveau.
--     - Les commandes passées avant ce script ne modifient jamais le stock.
--     - Boutons +1 / −1 du tableau de bord : le stock est corrigé en base, sans écraser une vente.
--  2. Annuaire des boutiques : le numéro WhatsApp et l'adresse de la boutique (déjà affichés sur
--     sa vitrine) sont ajoutés, pour le bouton WhatsApp et l'adresse des fiches.

DO $$
BEGIN
    IF to_regprocedure('public.orders_enforce_integrity()') IS NULL
       OR to_regprocedure('public.public_shops_directory()') IS NULL
       OR to_regprocedure('public.is_platform_admin()') IS NULL THEN
        RAISE EXCEPTION 'Exécutez d''abord security_fixes.sql, security_fixes_2.sql, admin_locations.sql, new_features.sql puis security_fixes_3.sql';
    END IF;
END $$;

-- ===========================================================================
-- 1. Stock
-- ===========================================================================
-- true : le stock de la commande est déduit · false : pas (encore) déduit · NULL : commande antérieure.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN;

-- Quantité totale par produit : un même produit peut figurer plusieurs fois (tailles, couleurs).
-- Tri par identifiant : deux commandes simultanées verrouillent les produits dans le même ordre.
CREATE OR REPLACE FUNCTION public.order_quantities(p_items JSONB)
RETURNS TABLE (product_id UUID, quantity INTEGER)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT (i ->> 'product_id')::UUID, sum((i ->> 'quantity')::INTEGER)::INTEGER
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_items) = 'array' THEN p_items ELSE '[]'::jsonb END) i
    WHERE i ->> 'product_id' IS NOT NULL
    GROUP BY 1
    ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.order_quantities(JSONB) FROM PUBLIC, anon, authenticated;

-- p_mode : 'check' vérifie seulement · 'take' vérifie puis déduit · 'force' déduit même au-delà du stock
-- (commande déjà payée ou déjà acceptée : le stock négatif signale une vente en trop) · 'give_back' rend.
CREATE OR REPLACE FUNCTION public.apply_order_stock(p_merchant_id UUID, p_items JSONB, p_mode TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_line RECORD;
    v_product RECORD;
BEGIN
    IF p_mode NOT IN ('check', 'take', 'force', 'give_back') THEN
        RAISE EXCEPTION 'Mode de stock inconnu : %', p_mode;
    END IF;

    FOR v_line IN SELECT * FROM public.order_quantities(p_items) LOOP
        -- Ligne verrouillée jusqu'à la fin de la commande : la dernière pièce ne part qu'une fois.
        SELECT p.id, p.name, p.stock INTO v_product
        FROM public.products p
        WHERE p.id = v_line.product_id AND p.merchant_id = p_merchant_id
        FOR UPDATE;
        CONTINUE WHEN NOT FOUND; -- produit supprimé depuis la commande

        IF p_mode IN ('check', 'take') AND v_product.stock < v_line.quantity THEN
            IF v_product.stock <= 0 THEN
                RAISE EXCEPTION 'Désolé, « % » est épuisé. Retirez-le du panier pour continuer.', v_product.name;
            END IF;
            RAISE EXCEPTION 'Il ne reste que % de « % ». Réduisez la quantité dans le panier.',
                v_product.stock || CASE WHEN v_product.stock = 1 THEN ' exemplaire' ELSE ' exemplaires' END,
                v_product.name;
        END IF;

        IF p_mode IN ('take', 'force') THEN
            UPDATE public.products SET stock = stock - v_line.quantity WHERE id = v_product.id;
        ELSIF p_mode = 'give_back' THEN
            UPDATE public.products SET stock = stock + v_line.quantity WHERE id = v_product.id;
        END IF;
    END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_order_stock(UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;

-- Nouvelle commande. Les déclencheurs BEFORE d'un même événement s'exécutent par ordre alphabétique
-- (règle documentée de PostgreSQL) : « orders_reserve_stock » passe après « orders_enforce_integrity »,
-- donc sur un panier déjà vérifié (produits de la boutique, quantités de 1 à 100).
CREATE OR REPLACE FUNCTION public.orders_reserve_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.payment_method = 'MOBILE_MONEY' THEN
        -- Le client ne peut pas payer un produit épuisé ; le stock baissera à la confirmation du paiement.
        PERFORM public.apply_order_stock(NEW.merchant_id, NEW.cart_items, 'check');
        NEW.stock_reserved := false;
    ELSE
        PERFORM public.apply_order_stock(NEW.merchant_id, NEW.cart_items, 'take');
        NEW.stock_reserved := true;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.orders_reserve_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_reserve_stock ON public.orders;
CREATE TRIGGER orders_reserve_stock
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.orders_reserve_stock();

-- Changement d'une commande : paiement confirmé, annulation, réactivation.
-- Une commande existante n'est jamais bloquée ici (pas de refus pour stock insuffisant).
CREATE OR REPLACE FUNCTION public.orders_sync_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_counts BOOLEAN;
BEGIN
    -- Colonne gérée uniquement par la base, quelle que soit la demande de modification.
    NEW.stock_reserved := OLD.stock_reserved;
    IF OLD.stock_reserved IS NULL THEN
        RETURN NEW; -- commande antérieure à la gestion du stock
    END IF;

    -- La commande compte dans le stock si elle n'est pas annulée et, pour Wave / Orange Money,
    -- si le paiement est confirmé ou si la boutique l'a déjà prise en charge.
    v_counts := NEW.status::TEXT <> 'CANCELLED'
        AND (NEW.payment_method IS DISTINCT FROM 'MOBILE_MONEY'
             OR NEW.payment_status = 'PAID'
             OR NEW.status::TEXT <> 'PENDING');

    IF OLD.stock_reserved AND NOT v_counts THEN
        PERFORM public.apply_order_stock(OLD.merchant_id, OLD.cart_items, 'give_back');
        NEW.stock_reserved := false;
    ELSIF NOT OLD.stock_reserved AND v_counts THEN
        PERFORM public.apply_order_stock(NEW.merchant_id, NEW.cart_items, 'force');
        NEW.stock_reserved := true;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.orders_sync_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_sync_stock ON public.orders;
CREATE TRIGGER orders_sync_stock
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.orders_sync_stock();

-- Réassort rapide depuis le tableau de bord (+1 / −1) : modification relative, faite en base.
-- Une vente passée au même moment n'est donc jamais écrasée. Un retrait ne fait pas descendre
-- sous zéro (un stock déjà négatif, signe d'une vente en trop, n'est pas aggravé).
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_product_id UUID, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stock INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Connexion requise.';
    END IF;
    IF p_delta IS NULL OR p_delta = 0 OR abs(p_delta) > 1000 THEN
        RAISE EXCEPTION 'Quantité invalide.';
    END IF;

    UPDATE public.products
    SET stock = CASE WHEN p_delta > 0 THEN stock + p_delta ELSE greatest(stock + p_delta, least(stock, 0)) END
    WHERE id = p_product_id AND merchant_id = auth.uid()
    RETURNING stock INTO v_stock;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit introuvable.';
    END IF;
    RETURN v_stock;
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_product_stock(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INTEGER) TO authenticated;

-- ===========================================================================
-- 2. Annuaire : numéro WhatsApp et adresse de la boutique
-- ===========================================================================
-- Même fonction que dans new_features.sql, avec deux colonnes en plus (à la fin : « ORDER BY 6 »
-- désigne toujours la colonne « featured »). Ces deux informations sont déjà publiques sur la vitrine.
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
