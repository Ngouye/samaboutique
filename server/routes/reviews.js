import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, reviews: data });
  } catch (error) {
    console.error("Erreur serveur lors de la récupération des avis :", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reviews - Add a new review
router.post('/', async (req, res) => {
  try {
    const { product_id, order_id, rating, comment, customer_name } = req.body;

    // Optional: Validate that the order exists and belongs to the product
    if (order_id) {
       const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', order_id)
        .single();
        
       if (orderError) throw new Error("Commande invalide pour cet avis.");
    }

    const { data, error } = await supabase.from('reviews').insert([{
      product_id,
      order_id: order_id || null, // Can be null if we allow general reviews for now
      rating,
      comment,
      customer_name
    }]).select().single();

    if (error) throw error;
    res.json({ success: true, review: data });
  } catch (error) {
    console.error("Erreur serveur lors de l'ajout d'un avis :", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
