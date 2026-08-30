-- Table: merchants (Liée à auth.users)
CREATE TABLE public.merchants (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    shop_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table: products
CREATE TABLE public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    merchant_id UUID REFERENCES public.merchants(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_fcfa INTEGER NOT NULL,
    stock INTEGER DEFAULT 0 NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table: orders
CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED');

CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    merchant_id UUID REFERENCES public.merchants(id) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_zone TEXT NOT NULL,
    total_amount_fcfa INTEGER NOT NULL,
    status order_status DEFAULT 'PENDING'::order_status NOT NULL,
    cart_items JSONB NOT NULL, -- Stocker les produits achetés et leurs quantités
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Activation du Row Level Security (RLS)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Politiques pour 'merchants'
CREATE POLICY "Les marchands peuvent voir leur propre profil" 
ON public.merchants FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Tout le monde peut voir les profils marchands"
ON public.merchants FOR SELECT USING (true);

CREATE POLICY "Les marchands peuvent insérer/modifier leur profil"
ON public.merchants FOR ALL USING (auth.uid() = id);

-- Politiques pour 'products'
CREATE POLICY "Tout le monde peut voir les produits"
ON public.products FOR SELECT USING (true);

CREATE POLICY "Les marchands peuvent gérer leurs produits"
ON public.products FOR ALL USING (auth.uid() = merchant_id);

-- Politiques pour 'orders'
CREATE POLICY "Les clients peuvent insérer des commandes"
ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Les marchands peuvent voir et modifier leurs propres commandes"
ON public.orders FOR SELECT USING (auth.uid() = merchant_id);

CREATE POLICY "Les marchands peuvent modifier le statut de leurs commandes"
ON public.orders FOR UPDATE USING (auth.uid() = merchant_id);

-- =========================================================
-- Trigger pour créer automatiquement le profil Marchand
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.merchants (id, shop_name, phone_number)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'shop_name', 
    new.raw_user_meta_data->>'phone_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclencheur lié à la table d'authentification
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- =========================================================
-- Configuration du Stockage (Storage) pour les images
-- =========================================================
-- (Si le bucket n'existe pas déjà via l'UI ou l'API)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Autoriser la lecture publique
CREATE POLICY "Lecture publique des images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- Autoriser les marchands à uploader des images
CREATE POLICY "Ajout d'images par les marchands" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
