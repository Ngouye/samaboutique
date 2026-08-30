-- Script pour créer la table des livreurs (drivers)

CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    vehicle_type TEXT,
    cni_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Activation de la politique de sécurité (RLS)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Politique pour que le marchand puisse tout faire sur SES livreurs
CREATE POLICY "Les marchands peuvent gerer leurs livreurs"
    ON public.drivers
    FOR ALL
    USING (auth.uid() = merchant_id);

-- Politique pour permettre aux utilisateurs anonymes/publics de lire (optionnel, pour l'appli livreur plus tard si besoin)
-- Pour l'instant, seul le marchand a besoin d'y accéder.
