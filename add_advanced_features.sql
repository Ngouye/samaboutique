-- Script d'ajout des colonnes pour les fonctionnalités avancées

-- 1. Variantes (Tailles et Couleurs)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '{"sizes": [], "colors": []}';

-- 2. Galerie d'images (pour stocker d'autres photos du même produit)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 3. Système de notation et d'avis
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- (Optionnel) Peupler quelques produits avec des données factices pour tester la vitrine :
UPDATE public.products 
SET 
  variants = '{"sizes": ["S", "M", "L", "XL"], "colors": ["Noir", "Blanc", "Gris"]}',
  rating = 4.5,
  reviews_count = 12
WHERE category = 'Vêtements';

UPDATE public.products 
SET 
  variants = '{"sizes": ["40", "41", "42", "43", "44"], "colors": []}',
  rating = 4.8,
  reviews_count = 34
WHERE category = 'Chaussures';

-- 4. Personnalisation de la vitrine (Moteur de Thèmes)
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'modern';
