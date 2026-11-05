import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { reportError } from '../lib/monitoring.js';

dotenv.config();

const router = express.Router();

// Initialize Supabase with Service Role Key for server-side operations if needed
// For reading reviews, we can just use the public API, but since we are on the server, we use the service key.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/reviews/:productId - Fetch reviews for a specific product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { data, error } = await supabase
      .from('reviews')
      .select('id, product_id, rating, comment, customer_name, verified, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, reviews: data });
  } catch (error) {
    reportError(error, 'Lecture des avis');
    res.status(500).json({ success: false, error: 'Impossible de charger les avis.' });
  }
});

// Les avis sont publiés via la fonction SQL submit_review (validation + limitation des envois).
// L'ancienne route POST, qui insérait sans contrôle avec la clé service_role, a été supprimée.

export default router;
