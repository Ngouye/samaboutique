-- Fichier : add_driver_tracking.sql
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter les colonnes de suivi à la table orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- 2. Mettre à jour la fonction de validation pour inclure le nom du livreur
CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id UUID, p_pin TEXT, p_driver_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    real_pin VARCHAR(4);
BEGIN
    -- Récupérer le vrai code de la base de données
    SELECT delivery_pin INTO real_pin FROM public.orders WHERE id = p_order_id;
    
    -- Si la commande n'avait pas de code (anciennes commandes) ou si le code correspond
    IF real_pin IS NULL OR real_pin = p_pin THEN
        UPDATE public.orders 
        SET 
            status = 'DELIVERED'::order_status,
            driver_name = p_driver_name,
            delivered_at = NOW()
        WHERE id = p_order_id;
        
        RETURN TRUE; -- Succès
    ELSE
        RETURN FALSE; -- Mauvais code
    END IF;
END;
$$;
