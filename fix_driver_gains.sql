-- ⚠️ OBSOLÈTE : remplacé par security_fixes_2.sql. Inutile d'exécuter ce fichier.
--    (Sans danger s'il a déjà été exécuté : security_fixes_2.sql supprime cette version.)

-- Fichier : fix_driver_gains.sql
-- À exécuter dans l'éditeur SQL de Supabase (après add_driver_assignment.sql).
--
-- Corrige deux problèmes de l'application livreur :
--   1. L'onglet « Gains » restait à 0 : la fonction ne renvoyait jamais les commandes livrées.
--   2. Les commandes déjà payées (Wave / Orange Money) s'affichaient « À encaisser » :
--      la colonne payment_method n'était pas renvoyée.
--
-- Les livraisons du jour ne sont renvoyées qu'au livreur authentifié (téléphone + CNI
-- vérifiés côté serveur), pour ne pas exposer davantage de données clients.

DROP FUNCTION IF EXISTS public.get_driver_orders(TEXT);
DROP FUNCTION IF EXISTS public.get_driver_orders(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_driver_orders(
    p_shop_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_cni TEXT DEFAULT NULL
)
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
    v_merchant_id UUID;
    v_driver_name TEXT;
    v_day_start TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT m.id INTO v_merchant_id
    FROM public.merchants m
    WHERE m.shop_name ILIKE p_shop_name
    LIMIT 1;

    IF v_merchant_id IS NULL THEN
        RETURN;
    END IF;

    -- Livreur authentifié (facultatif) : sert uniquement à renvoyer SES livraisons du jour.
    IF p_phone IS NOT NULL AND p_cni IS NOT NULL THEN
        SELECT d.full_name INTO v_driver_name
        FROM public.drivers d
        WHERE d.merchant_id = v_merchant_id
          AND d.phone_number = p_phone
          AND d.cni_number = p_cni
        LIMIT 1;
    END IF;

    -- Début de la journée à Dakar
    v_day_start := date_trunc('day', now() AT TIME ZONE 'Africa/Dakar') AT TIME ZONE 'Africa/Dakar';

    RETURN QUERY
    SELECT o.id, o.customer_name, o.customer_phone, o.customer_address, o.delivery_zone,
           o.total_amount_fcfa, o.status, o.cart_items, o.created_at, o.driver_name,
           o.payment_method, o.delivered_at
    FROM public.orders o
    WHERE o.merchant_id = v_merchant_id
      AND (
            o.status IN ('PREPARING'::order_status, 'IN_TRANSIT'::order_status)
         OR (
                v_driver_name IS NOT NULL
            AND o.status = 'DELIVERED'::order_status
            AND o.driver_name = v_driver_name
            AND o.delivered_at >= v_day_start
         )
      )
    ORDER BY o.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_orders(TEXT, TEXT, TEXT) TO anon, authenticated;
