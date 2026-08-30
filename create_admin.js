import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvtqcxyqjsodzdjshits.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2dHFjeHlxanNvZHpkanNoaXRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg2NDI1MSwiZXhwIjoyMTAzNDQwMjUxfQ.H0HPADh6UpJQax4aSb-cAGVFhJC-WgVXtAtu6nntQ7s';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  console.log("Création de l'utilisateur admin via l'API d'administration...");
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin2@samaboutik.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      shop_name: 'Boutique Pro Dakar',
      phone_number: '77 111 22 33'
    }
  });

  if (error) {
    console.error('Erreur Supabase:', error);
  } else {
    console.log('Succès ! Utilisateur créé:', data.user.email);
  }
}

createAdmin();
