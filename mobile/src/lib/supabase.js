// Client Supabase de l'application : même base que le site, avec la clé publique « anon »
// (protégée par les règles d'accès de la base). Pas de compte client pour l'instant : aucune session gardée.
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const configError = !url || !key
  ? 'Configuration manquante : copiez mobile/.env.example en mobile/.env puis relancez « npx expo start ».'
  : null;

export const supabase = configError
  ? null
  : createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
