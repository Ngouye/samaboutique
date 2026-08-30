-- Ajout des nouvelles colonnes pour les fonctionnalités avancées

-- 1. Ajout de la colonne catégorie
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Ajout de la colonne variants pour stocker un tableau JSON de chaînes (ex: ["S", "M", "L"] ou ["Rouge", "Bleu"])
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB;

-- Note: Ces colonnes n'ont pas de contrainte NOT NULL pour rester rétrocompatibles avec les produits existants.
