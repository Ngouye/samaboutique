-- Ajout des options de paiement à la table orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'ON_DELIVERY',
ADD COLUMN IF NOT EXISTS payment_deposit_amount INTEGER,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
