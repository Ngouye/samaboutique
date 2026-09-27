-- Fichier : security_fixes.sql
-- À exécuter dans l'éditeur SQL de Supabase.
--
-- 1. Les commandes ne peuvent plus être créées avec un montant ou un statut choisi par le client :
--    le total est recalculé à partir des vrais prix des produits et de la zone de livraison.
-- 2. Un marchand ne peut plus activer ou prolonger lui-même son abonnement :
--    seul le serveur (webhook PayDunya, clé service_role) peut modifier ces colonnes.
-- 3. Journal des paiements d'abonnement : un même paiement ne prolonge l'abonnement qu'une fois.

-- ---------------------------------------------------------------------------
-- 0. Colonnes utilisées (sans effet si elles existent déjà)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'ON_DELIVERY';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_pin VARCHAR(4);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'debutant';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS delivery_zones JSONB;

-- Rôle de l'appelant : 'anon' / 'authenticated' pour le navigateur, 'service_role' pour le serveur,
-- ou l'utilisateur Postgres (éditeur SQL, triggers internes).
CREATE OR REPLACE FUNCTION public.request_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', current_user::text);
$$;

-- ---------------------------------------------------------------------------
-- 1. Intégrité des commandes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orders_enforce_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_items JSONB := '[]'::jsonb;
    v_product RECORD;
    v_qty INTEGER;
    v_name TEXT;
    v_subtotal INTEGER := 0;
    v_zones JSONB;
    v_zone_price INTEGER;
    -- Mêmes zones par défaut que la vitrine (PublicShop.jsx) et le serveur (server/lib/deliveryZones.js)
    v_default_zones CONSTANT JSONB := '[
      {"name": "Dakar Plateau / Médina", "price": 1000, "active": true},
      {"name": "Almadies / Ngor / Ouakam", "price": 1500, "active": true},
      {"name": "Mermoz / Sacré-Cœur / Point E", "price": 1500, "active": true},
      {"name": "Yoff / Parcelles Assainies", "price": 2000, "active": true},
      {"name": "Pikine / Guédiawaye", "price": 2500, "active": true},
      {"name": "Rufisque / Keur Massar / Diamniadio", "price": 3000, "active": true}
    ]'::jsonb;
BEGIN
    IF NEW.cart_items IS NULL OR jsonb_typeof(NEW.cart_items) <> 'array' OR jsonb_array_length(NEW.cart_items) = 0 THEN
        RAISE EXCEPTION 'Panier vide ou invalide';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.cart_items) LOOP
        v_qty := (v_item ->> 'quantity')::INTEGER;
        IF v_qty IS NULL OR v_qty < 1 OR v_qty > 100 THEN
            RAISE EXCEPTION 'Quantité invalide';
        END IF;

        SELECT p.id, p.name, p.price_fcfa INTO v_product
        FROM public.products p
        WHERE p.id = (v_item ->> 'product_id')::UUID
          AND p.merchant_id = NEW.merchant_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produit introuvable pour cette boutique';
        END IF;

        -- Le libellé peut contenir la variante choisie (« Boubou (M - Noir) »), jamais un autre nom.
        v_name := coalesce(v_item ->> 'name', v_product.name);
        IF left(v_name, length(v_product.name)) <> v_product.name THEN
            v_name := v_product.name;
        END IF;

        v_items := v_items || jsonb_build_object(
            'product_id', v_product.id,
            'name', left(v_name, 200),
            'price', v_product.price_fcfa,
            'quantity', v_qty
        );
        v_subtotal := v_subtotal + v_product.price_fcfa * v_qty;
    END LOOP;

    SELECT m.delivery_zones INTO v_zones FROM public.merchants m WHERE m.id = NEW.merchant_id;
    IF v_zones IS NULL OR jsonb_typeof(v_zones) <> 'array' OR jsonb_array_length(v_zones) = 0 THEN
        v_zones := v_default_zones;
    END IF;

    SELECT (z ->> 'price')::INTEGER INTO v_zone_price
    FROM jsonb_array_elements(v_zones) z
    WHERE z ->> 'name' = NEW.delivery_zone
      AND coalesce((z ->> 'active')::BOOLEAN, false)
    LIMIT 1;
    IF v_zone_price IS NULL THEN
        RAISE EXCEPTION 'Zone de livraison invalide';
    END IF;

    NEW.cart_items := v_items;
    NEW.total_amount_fcfa := v_subtotal + v_zone_price;
    NEW.status := 'PENDING'::order_status;
    NEW.payment_status := 'PENDING';
    NEW.driver_name := NULL;
    NEW.delivered_at := NULL;
    IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN ('ON_DELIVERY', 'MOBILE_MONEY') THEN
        NEW.payment_method := 'ON_DELIVERY';
    END IF;
    IF NEW.delivery_pin IS NULL OR NEW.delivery_pin !~ '^[0-9]{4}$' THEN
        NEW.delivery_pin := lpad(floor(random() * 10000)::INTEGER::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enforce_integrity ON public.orders;
CREATE TRIGGER orders_enforce_integrity
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.orders_enforce_integrity();

-- ---------------------------------------------------------------------------
-- 2. Abonnements : colonnes réservées au serveur
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merchants_protect_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN := false;
BEGIN
    -- Serveur (service_role) et Postgres (éditeur SQL, trigger de création de compte) : autorisés.
    IF public.request_role() NOT IN ('anon', 'authenticated') THEN
        RETURN NEW;
    END IF;

    -- Administrateur de la plateforme (table platform_admins créée par security_fixes_2.sql).
    IF to_regprocedure('public.is_platform_admin()') IS NOT NULL THEN
        EXECUTE 'SELECT public.is_platform_admin()' INTO v_is_admin;
    END IF;
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.subscription_plan := 'debutant';
        NEW.subscription_status := 'active';
        NEW.subscription_end_date := NULL;
        NEW.is_suspended := false;
        RETURN NEW;
    END IF;

    IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date
       OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
        RAISE EXCEPTION 'Modification non autorisée : l''abonnement est mis à jour automatiquement après paiement.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchants_protect_billing ON public.merchants;
CREATE TRIGGER merchants_protect_billing
    BEFORE INSERT OR UPDATE ON public.merchants
    FOR EACH ROW EXECUTE FUNCTION public.merchants_protect_billing();

-- ---------------------------------------------------------------------------
-- 3. Journal des paiements d'abonnement (idempotence du webhook)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    invoice_token TEXT PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    amount_fcfa INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
-- RLS activé sans politique : seul le serveur (service_role) peut lire / écrire.
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
