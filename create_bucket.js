import { createClient } from '@supabase/supabase-js';

// Aucun secret dans ce fichier : tout est lu depuis l'environnement.
// Exemple : node --env-file=server/.env create_bucket.js
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Variables manquantes : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createBucket() {
  console.log("Création du bucket 'product-images' en cours...");

  const { data, error } = await supabase.storage.createBucket('product-images', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  });

  if (error) {
    console.error("Erreur lors de la création du bucket :", error.message);
  } else {
    console.log("Succès ! Le bucket a été créé :", data);
  }
}

createBucket();
