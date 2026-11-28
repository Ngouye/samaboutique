// Produits récemment consultés sur ce téléphone (les 12 derniers), affichés sur l'accueil.
// Seul un résumé du produit est gardé ; la fiche complète est rechargée à l'ouverture.
import { store } from './storage';

const KEY = 'recent';
const MAX = 12;

export const listRecent = () => store.get(KEY, []);

export function addRecent(product, shop) {
  if (!product?.id) return;
  const entry = {
    id: String(product.id),
    name: product.name,
    price_fcfa: product.price_fcfa,
    image_url: product.image_url || null,
    stock: typeof product.stock === 'number' ? product.stock : null,
    category: product.category || null,
    merchant_id: product.merchant_id,
    shop: shop?.shop_name ? { shop_name: shop.shop_name, theme_color: shop.theme_color || null, logo_url: shop.logo_url || null } : null,
    at: Date.now(),
  };
  store.set(KEY, [entry, ...listRecent().filter((p) => p.id !== entry.id)].slice(0, MAX));
}

export const clearRecent = () => store.remove(KEY);
