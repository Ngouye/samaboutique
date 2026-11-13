-- Fichier : paiements_et_ia.sql
-- ⚠️ Déployez D'ABORD la nouvelle version du site et du serveur, PUIS exécutez ce script dans l'éditeur SQL
-- de Supabase (après stock_et_annuaire.sql). Le script peut être relancé sans risque.
--
--  1. Paiement mobile : chaque commande garde l'opérateur choisi par le client
--     (Wave, Orange Money, Free Money ou Wizall), affiché dans le tableau de bord.
--  2. Assistant IA : chaque fiche produit rédigée et chaque photo studio créée est comptée, pour
--     appliquer un plafond mensuel par forfait (ces services sont payés par SamaBoutik à l'usage).

DO $$
BEGIN
    IF to_regprocedure('public.apply_order_stock(uuid, jsonb, text)') IS NULL THEN
        RAISE EXCEPTION 'Exécutez d''abord stock_et_annuaire.sql';
    END IF;
END $$;

-- ===========================================================================
-- 1. Opérateur de paiement mobile
-- ===========================================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_channel TEXT;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_channel_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_channel_check
    CHECK (payment_channel IS NULL OR payment_channel IN ('wave', 'orange_money', 'free_money', 'wizall'));

-- ===========================================================================
-- 2. Utilisation de l'assistant IA (lue et écrite uniquement par le serveur)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage (
    id BIGSERIAL PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('product_sheet', 'studio_photo')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_merchant_kind_created_idx ON public.ai_usage (merchant_id, kind, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.ai_usage_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.ai_usage TO service_role;
GRANT USAGE ON SEQUENCE public.ai_usage_id_seq TO service_role;
