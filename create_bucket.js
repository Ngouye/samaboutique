import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvtqcxyqjsodzdjshits.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2dHFjeHlxanNvZHpkanNoaXRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzg2NDI1MSwiZXhwIjoyMTAzNDQwMjUxfQ.H0HPADh6UpJQax4aSb-cAGVFhJC-WgVXtAtu6nntQ7s';

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
