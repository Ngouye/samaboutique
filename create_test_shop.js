import { createClient } from '@supabase/supabase-js';

// Aucun secret dans ce fichier : tout est lu depuis l'environnement.
// Exemple : node --env-file=.env create_test_shop.js
// (.env doit contenir VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_SHOP_EMAIL, TEST_SHOP_PASSWORD)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.TEST_SHOP_EMAIL;
const password = process.env.TEST_SHOP_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey || !email || !password) {
  console.error('Variables manquantes : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_SHOP_EMAIL, TEST_SHOP_PASSWORD');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createShop() {
  console.log("Création de la boutique en cours...");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        shop_name: 'La Boutique VIP',
        phone_number: '770000000'
      }
    }
  });

  if (error) {
    console.error('Erreur Supabase:', error.message);
  } else {
    console.log('Succès ! Utilisateur créé:', data.user.email);
  }
}

createShop();
