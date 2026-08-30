-- Fichier : setup_driver.sql
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Fonction pour récupérer les commandes "En préparation" d'une boutique spécifique
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
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER -- Permet à la fonction de s'exécuter avec les privilèges du créateur (contourne le RLS public)
AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.customer_name, o.customer_phone, o.customer_address, o.delivery_zone, o.total_amount_fcfa, o.status, o.cart_items, o.created_at
    FROM public.orders o
    JOIN public.merchants m ON o.merchant_id = m.id
    WHERE m.shop_name ILIKE p_shop_name AND o.status = 'PREPARING'::order_status
    ORDER BY o.created_at ASC;
END;
$$;

-- 2. Fonction pour permettre au livreur de marquer une commande comme "Livrée"
CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.orders 
    SET status = 'DELIVERED'::order_status 
    WHERE id = p_order_id;
END;
$$;
