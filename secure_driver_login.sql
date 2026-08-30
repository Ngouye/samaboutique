-- Script pour l'authentification des livreurs

CREATE OR REPLACE FUNCTION public.authenticate_driver(p_shop_name TEXT, p_phone TEXT, p_cni TEXT)
RETURNS TEXT AS $$
DECLARE
    v_merchant_id UUID;
    v_driver_name TEXT;
BEGIN
    -- Trouver le merchant_id à partir du nom de la boutique
    SELECT id INTO v_merchant_id
    FROM public.merchants
    WHERE shop_name ILIKE p_shop_name
    LIMIT 1;

    IF v_merchant_id IS NULL THEN
        RAISE EXCEPTION 'Boutique introuvable';
    END IF;

    -- Chercher le livreur avec le numéro de téléphone et de CNI
    SELECT full_name INTO v_driver_name
    FROM public.drivers
    WHERE merchant_id = v_merchant_id 
      AND phone_number = p_phone 
      AND cni_number = p_cni
    LIMIT 1;

    IF v_driver_name IS NULL THEN
        RAISE EXCEPTION 'Identifiants incorrects ou non enregistrés.';
    END IF;

    RETURN v_driver_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
