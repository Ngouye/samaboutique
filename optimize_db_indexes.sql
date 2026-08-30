-- Script d'optimisation des performances pour Supabase (SamaBoutik)
-- Exécutez ce script dans l'éditeur SQL de Supabase.

-- 1. Index sur les produits (recherche par marchand très fréquente)
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);

-- 2. Index sur les commandes (recherche par marchand et par statut)
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_status ON orders(merchant_id, status);

-- 3. Index sur le contenu du panier (optimisation des requêtes JSONB)
CREATE INDEX IF NOT EXISTS idx_orders_cart_items ON orders USING GIN (cart_items);

-- 4. Index sur les marchands (recherche par slug/nom de boutique)
CREATE INDEX IF NOT EXISTS idx_merchants_shop_name ON merchants(shop_name);

-- 5. Index sur les livreurs
CREATE INDEX IF NOT EXISTS idx_drivers_merchant_id ON drivers(merchant_id);
