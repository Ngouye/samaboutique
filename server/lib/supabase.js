import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Client Supabase avec la Service Role Key (droits d'admin) : ne jamais l'exposer au navigateur.
export const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Première adresse de FRONTEND_URL : utilisée pour les liens envoyés aux clients.
export const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

export const shopUrl = (shopName) => `${frontendUrl()}/boutique/${encodeURIComponent(shopName || '')}`;
