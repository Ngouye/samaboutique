-- =====================================================================
-- Suivi de commande : retrouver une commande quelle que soit l'écriture du numéro
-- ---------------------------------------------------------------------
-- Avant : le numéro devait être tapé exactement comme à la commande
-- (« 77 123 45 67 » ≠ « 771234567 » ≠ « +221 77 123 45 67 »).
-- Après : espaces, tirets, « +221 » et « 00221 » sont ignorés ; le code PIN
-- ignore les espaces. Les limites anti-essais (5 par numéro, 30 par connexion,
-- sur 15 minutes) sont conservées.
--
-- À exécuter une fois dans Supabase : SQL Editor → coller ce fichier → Run.
-- Le script peut être relancé sans risque.
-- =====================================================================

-- Clé de comparaison d'un numéro : chiffres seuls, sans l'indicatif du Sénégal.
CREATE OR REPLACE FUNCTION public.phone_key(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE WHEN length(d) = 12 AND d LIKE '221%' THEN substr(d, 4) ELSE d END
    FROM (SELECT regexp_replace(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '^00', '') AS d) AS s;
$$;
REVOKE ALL ON FUNCTION public.phone_key(TEXT) FROM PUBLIC, anon, authenticated;

-- Recherche rapide : on filtre d'abord sur le code PIN, puis sur le numéro.
CREATE INDEX IF NOT EXISTS orders_delivery_pin_idx ON public.orders (delivery_pin);

CREATE OR REPLACE FUNCTION public.track_order(p_phone TEXT, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key TEXT := public.phone_key(p_phone);
    v_pin TEXT := upper(regexp_replace(coalesce(p_pin, ''), '[^0-9A-Za-z]', '', 'g'));
    v_ip TEXT := public.client_ip();
    v_order public.orders;
BEGIN
    IF public.attempts_count('track', v_key, interval '15 minutes') >= 5
       OR public.attempts_count('track_ip', v_ip, interval '15 minutes') >= 30 THEN
        RETURN json_build_object('ok', false, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
    END IF;

    IF length(v_key) >= 6 AND v_pin <> '' THEN
        SELECT * INTO v_order FROM public.orders
        WHERE delivery_pin = v_pin
          AND public.phone_key(customer_phone) = v_key
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_order.id IS NULL THEN
        PERFORM public.attempts_log('track', v_key);
        PERFORM public.attempts_log('track_ip', v_ip);
        -- « tolerant » : le site sait que le numéro a déjà été comparé sous toutes ses écritures
        RETURN json_build_object('ok', false, 'error', 'Commande introuvable ou code PIN incorrect', 'tolerant', true);
    END IF;

    RETURN json_build_object('ok', true, 'order', public.order_receipt(v_order));
END;
$$;
REVOKE ALL ON FUNCTION public.track_order(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(TEXT, TEXT) TO anon, authenticated;
