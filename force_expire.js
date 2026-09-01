import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function expireMerchant() {
  const email = 'gningngouye2001@gmail.com';
  console.log(`Expiration de la boutique pour l'email: ${email}...`);
  
  // 1. Get the user ID
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email);
    
  if (userError || !users || users.length === 0) {
    console.log("Erreur: Utilisateur non trouvé.");
    return;
  }
  
  const userId = users[0].id;
  
  // 2. Set the subscription_status to 'expired'
  const { error } = await supabase
    .from('merchants')
    .update({ 
      subscription_status: 'expired',
      subscription_end_date: new Date(Date.now() - 1000).toISOString() // Date dans le passé
    })
    .eq('id', userId);
    
  if (error) {
    console.error("Erreur lors de l'expiration:", error);
  } else {
    console.log("✅ Succès ! La boutique de " + email + " est maintenant expirée.");
    console.log("Allez sur le dashboard marchand pour voir le blocage rouge et tester le bouton de paiement !");
  }
}

expireMerchant();
