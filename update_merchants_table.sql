-- Fichier : update_merchants_table.sql
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les nouvelles colonnes pour les paramètres de la boutique
ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#4F46E5';
