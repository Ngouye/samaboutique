-- Fichier : add_merchant_info.sql
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les nouvelles colonnes pour les informations complètes du marchand
ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
