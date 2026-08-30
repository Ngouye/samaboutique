-- Fichier : add_driver_assignment.sql
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter le statut IN_TRANSIT
-- Note : Ceci doit s'exécuter avec succès avant le reste. 
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'IN_TRANSIT';

-- 2. Fonction pour assigner une commande (Anti-collision stricte)
CREATE OR REPLACE FUNCTION public.assign_order_to_driver(p_order_id UUID, p_driver_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_orders INT;
    v_order_status order_status;
BEGIN
    -- 1. Vérifier si le livreur a déjà une commande en cours
    SELECT count(*) INTO v_active_orders 
    FROM public.orders 
    WHERE driver_name = p_driver_name AND status = 'IN_TRANSIT'::order_status;
    
    IF v_active_orders > 0 THEN
        -- Le livreur a déjà une commande, on refuse
        RAISE EXCEPTION 'Vous avez déjà une course en cours (IN_TRANSIT). Veuillez la terminer d''abord.';
    END IF;

    -- 2. Lock de la ligne et vérification pour collision concurrente
    SELECT status INTO v_order_status 
    FROM public.orders 
    WHERE id = p_order_id FOR UPDATE;
    
    IF v_order_status != 'PREPARING'::order_status THEN
        -- La commande n'est plus disponible
        RAISE EXCEPTION 'Désolé, cette course a déjà été acceptée par un autre livreur.';
    END IF;

    -- 3. Si tout est bon, on assigne la commande
    UPDATE public.orders 
    SET 
        status = 'IN_TRANSIT'::order_status,
        driver_name = p_driver_name
    WHERE id = p_order_id;
    
    RETURN TRUE;
END;
$$;

-- 3. Mettre à jour la fonction de récupération des commandes
DROP FUNCTION IF EXISTS public.get_driver_orders(TEXT);

CREATE OR REPLACE FUNCTION public.get_driver_orders(p_shop_name TEXT)
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
    driver_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.customer_name, o.customer_phone, o.customer_address, o.delivery_zone, o.total_amount_fcfa, o.status, o.cart_items, o.created_at, o.driver_name
    FROM public.orders o
    JOIN public.merchants m ON o.merchant_id = m.id
    WHERE m.shop_name ILIKE p_shop_name 
      AND (o.status = 'PREPARING'::order_status OR o.status = 'IN_TRANSIT'::order_status)
    ORDER BY o.created_at ASC;
END;
$$;

-- 4. Sécuriser la validation du PIN (uniquement si IN_TRANSIT)
CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id UUID, p_pin TEXT, p_driver_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    real_pin VARCHAR(4);
    v_status order_status;
BEGIN
    -- Récupérer le vrai code et le statut
    SELECT delivery_pin, status INTO real_pin, v_status FROM public.orders WHERE id = p_order_id;
    
    IF v_status != 'IN_TRANSIT'::order_status THEN
         RAISE EXCEPTION 'Erreur : la commande doit être acceptée avant d''être livrée.';
    END IF;
    
    -- Si la commande n'avait pas de code ou si le code correspond
    IF real_pin IS NULL OR real_pin = p_pin THEN
        UPDATE public.orders 
        SET 
            status = 'DELIVERED'::order_status,
            delivered_at = NOW()
        WHERE id = p_order_id;
        
        RETURN TRUE; -- Succès
    ELSE
        RETURN FALSE; -- Mauvais code
    END IF;
END;
$$;
