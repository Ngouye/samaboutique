// Avis après livraison : même fonction que la vitrine du site (submit_review).
// Avec le numéro de la commande livrée, la base ajoute le badge « Achat vérifié ».
// Les produits déjà notés sont retenus sur ce téléphone pour ne pas les redemander.
import { supabase, configError } from './supabase';
import { store } from './storage';

const KEY = 'reviewed'; // { [id de commande]: [id de produit, …] }

export const reviewedIn = (orderId) => store.get(KEY, {})[String(orderId)] || [];
export const reviewsCount = () => Object.values(store.get(KEY, {})).reduce((n, list) => n + list.length, 0);

function markReviewed(orderId, productId) {
  const all = store.get(KEY, {});
  const list = new Set(all[String(orderId)] || []);
  list.add(String(productId));
  store.set(KEY, { ...all, [String(orderId)]: [...list] });
}

// Produits d'une commande (une seule fois chacun, même commandés en plusieurs tailles).
export function productsOfOrder(order) {
  const seen = new Map();
  (order?.cart_items || []).forEach((it) => {
    if (it?.product_id && !seen.has(String(it.product_id))) {
      seen.set(String(it.product_id), { id: String(it.product_id), name: String(it.name || '').replace(/\s*\([^)]*\)\s*$/, '') });
    }
  });
  return [...seen.values()];
}

export async function submitReview({ productId, rating, comment, name, orderId }) {
  if (configError) return { ok: false, error: configError };
  const text = String(comment || '').trim();
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: 'Choisissez une note de 1 à 5 étoiles.' };
  if (text.length < 3) return { ok: false, error: 'Écrivez quelques mots (3 caractères au moins).' };
  try {
    const { data, error } = await supabase.rpc('submit_review', {
      p_product_id: productId,
      p_rating: rating,
      p_comment: text.slice(0, 1000),
      p_customer_name: String(name || '').trim(),
      p_order_id: orderId || null,
    });
    if (error) return { ok: false, error: /fetch|network/i.test(error.message || '') ? 'Pas de connexion internet. Réessayez.' : 'Votre avis n’a pas pu être envoyé. Réessayez dans un instant.' };
    if (!data?.ok) return { ok: false, error: data?.error || 'Votre avis n’a pas pu être envoyé.' };
    markReviewed(orderId, productId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Pas de connexion internet. Réessayez.' };
  }
}
