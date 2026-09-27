import { createClient } from '@supabase/supabase-js';

// Aucun secret dans ce fichier : tout est lu depuis l'environnement.
// Exemple : node --env-file=server/.env create_admin.js
// (server/.env doit contenir SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD)
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  console.error('Variables manquantes : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  console.log("Création de l'utilisateur admin via l'API d'administration...");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      shop_name: process.env.ADMIN_SHOP_NAME || 'Boutique Admin',
      phone_number: process.env.ADMIN_PHONE || ''
    }
  });

  if (error) {
    console.error('Erreur Supabase:', error);
  } else {
    console.log('Succès ! Utilisateur créé:', data.user.email);
  }
}

createAdmin();
