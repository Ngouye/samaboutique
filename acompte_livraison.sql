-- Fichier : acompte_livraison.sql
-- ⚠️ Mettez D'ABORD en ligne la nouvelle version du site et du serveur, PUIS exécutez ce script dans
-- l'éditeur SQL de Supabase (après security_fixes.sql, security_fixes_2.sql, new_features.sql,
-- security_fixes_3.sql, stock_et_annuaire.sql et admin_complet.sql). Le script peut être relancé sans risque.
--
-- Paiement à la livraison avec acompte :
--  - le client paie 10 % du total (articles + livraison) en ligne (Wave, Orange Money…) pour confirmer
--    sa commande ; le livreur encaisse le reste à la livraison ;
--  - tant que l'acompte n'est pas payé, la commande n'est pas annoncée à la boutique et le stock n'est
--    pas réservé (il est vérifié) ;
--  - une commande « à la livraison » sans acompte n'est plus acceptée depuis la vitrine.
-- =====================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_deposit_amount INTEGER;

-- ---------------------------------------------------------------------------
-- 1. Montant de l'acompte : 10 % du total, arrondi aux 5 F supérieurs
--    (le reste à payer en espèces tombe ainsi sur un montant rendable).
--    Même calcul côté site (src/utils/payments.js) et serveur (server/lib/deposit.js).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_deposit(p_total INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT least(greatest(coalesce(p_total, 0), 0), ((greatest(coalesce(p_total, 0), 0) + 49) / 50) * 5);
$$;
GRANT EXECUTE ON FUNCTION public.order_deposit(INTEGER) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Nouvelle commande : total recalculé, acompte calculé par la base
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
    IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN ('ON_DELIVERY', 'MOBILE_MONEY', 'DEPOSIT') THEN
        NEW.payment_method := 'ON_DELIVERY';
    END IF;

    -- Depuis la vitrine (clients : anon / authenticated), le paiement à la livraison passe par l'acompte,
    -- enregistré par le serveur de paiement. L'éditeur SQL et le serveur ne sont pas concernés.
    IF NEW.payment_method = 'ON_DELIVERY' AND public.request_role() IN ('anon', 'authenticated') THEN
        RAISE EXCEPTION 'Un acompte de 10 %% est demandé pour le paiement à la livraison. Actualisez la page puis réessayez.';
    END IF;
    NEW.payment_deposit_amount := CASE WHEN NEW.payment_method = 'DEPOSIT'
        THEN public.order_deposit(NEW.total_amount_fcfa) END;

    IF NEW.delivery_pin IS NULL OR NEW.delivery_pin !~ '^[0-9]{4}$' THEN
        NEW.delivery_pin := lpad(floor(random() * 10000)::INTEGER::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Stock : comme Wave / Orange Money, une commande avec acompte est vérifiée à la commande
--    et ne réserve le stock qu'une fois l'acompte payé.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orders_reserve_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.payment_method IN ('MOBILE_MONEY', 'DEPOSIT') THEN
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

    -- La commande compte dans le stock si elle n'est pas annulée et, pour un paiement en ligne
    -- (Wave / Orange Money ou acompte), si le paiement est confirmé ou si la boutique l'a déjà prise en charge.
    v_counts := NEW.status::TEXT <> 'CANCELLED'
        AND (coalesce(NEW.payment_method, 'ON_DELIVERY') NOT IN ('MOBILE_MONEY', 'DEPOSIT')
             OR NEW.payment_status IN ('PAID', 'DEPOSIT_PAID')
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

-- ---------------------------------------------------------------------------
-- 4. WhatsApp : la commande avec acompte n'est annoncée qu'une fois l'acompte payé,
--    et les messages indiquent l'acompte et le reste à payer.
-- ---------------------------------------------------------------------------
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
        'payment_status', p_order.payment_status,
        'payment_deposit_amount', p_order.payment_deposit_amount,
        'driver_name', p_order.driver_name,
        'driver_phone', v_driver_phone
    ))
    ON CONFLICT (order_id, event) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_order_notification(public.orders, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.orders_whatsapp_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    BEGIN
        IF TG_OP = 'INSERT' THEN
            -- Une commande payée en ligne (en totalité ou par acompte) n'est annoncée qu'une fois payée.
            IF coalesce(NEW.payment_method, 'ON_DELIVERY') NOT IN ('MOBILE_MONEY', 'DEPOSIT') THEN
                PERFORM public.enqueue_order_notification(NEW, 'merchant_new_order', true);
                PERFORM public.enqueue_order_notification(NEW, 'customer_order_confirmed', false);
            END IF;
        ELSE
            IF (NEW.payment_method = 'MOBILE_MONEY' AND NEW.payment_status = 'PAID'
                AND OLD.payment_status IS DISTINCT FROM 'PAID')
               OR (NEW.payment_method = 'DEPOSIT' AND NEW.payment_status = 'DEPOSIT_PAID'
                AND OLD.payment_status IS DISTINCT FROM 'DEPOSIT_PAID') THEN
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

-- ---------------------------------------------------------------------------
-- 5. Reçu et suivi client : acompte, état du paiement et opérateur
-- ---------------------------------------------------------------------------
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
        'payment_status', p_order.payment_status,
        'payment_deposit_amount', p_order.payment_deposit_amount,
        'payment_channel', to_jsonb(p_order) ->> 'payment_channel',
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

-- Reçu au retour de PayDunya : paiement complet ou acompte, commandes de moins de 2 h.
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
      AND payment_method IN ('MOBILE_MONEY', 'DEPOSIT')
      AND created_at > now() - interval '2 hours';
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    RETURN public.order_receipt(v_order);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_receipt(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Espace livreur : acompte et état du paiement, pour encaisser le bon reste
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_driver_orders(TEXT);
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
    delivered_at TIMESTAMP WITH TIME ZONE,
    payment_status TEXT,
    payment_deposit_amount INTEGER
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
           o.created_at, o.driver_name, o.payment_method, o.delivered_at,
           o.payment_status, o.payment_deposit_amount
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
REVOKE ALL ON FUNCTION public.get_driver_orders(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_driver_orders(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Administration : espèces encaissées par les livreurs, acompte déduit
--    (même définition que admin_complet.sql)
-- ---------------------------------------------------------------------------
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
            sum(o.total_amount_fcfa - CASE
                    WHEN (to_jsonb(o) ->> 'payment_method') = 'DEPOSIT'
                     AND (to_jsonb(o) ->> 'payment_status') IN ('DEPOSIT_PAID', 'PAID')
                    THEN coalesce((to_jsonb(o) ->> 'payment_deposit_amount')::INTEGER, 0)
                    ELSE 0 END)
                FILTER (WHERE o.status::TEXT = 'DELIVERED'
                    AND coalesce(to_jsonb(o) ->> 'payment_method', 'ON_DELIVERY') <> 'MOBILE_MONEY') AS cash,
            max((to_jsonb(o) ->> 'delivered_at')::TIMESTAMP WITH TIME ZONE) AS last_at
        FROM public.orders o
        WHERE o.merchant_id = d.merchant_id
          AND (to_jsonb(o) ->> 'driver_name') = d.full_name
    ) x ON true
    ORDER BY coalesce(x.delivered, 0) DESC, d.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_drivers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_drivers() TO authenticated;
