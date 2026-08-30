import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvtqcxyqjsodzdjshits.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2dHFjeHlxanNvZHpkanNoaXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjQyNTEsImV4cCI6MjEwMzQ0MDI1MX0.2WPb8S_6AwTxtlNq29kAfwlBcPE4w-13WDhUz7hyQzk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createShop() {
  console.log("Création de la boutique en cours...");
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@samaboutik.com',
    password: 'password123',
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
