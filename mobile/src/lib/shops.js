// Boutiques visibles dans l'application : la même liste que l'annuaire du site (« Boutiques près de moi »).
// Une boutique y figure si le commerçant l'a inscrite, qu'elle a au moins un produit en ligne
// et qu'elle n'est pas suspendue. Rien à faire de plus côté commerçant.
import { supabase, configError } from './supabase';
import { plain } from './format';
import { isLive } from './shared';

const n = (v) => Number(v) || 0;

// Mises en avant (offres Pro et Premium) d'abord, puis les mieux notées, puis les plus fournies.
export const sortShops = (list) => [...(list || [])].sort((a, b) =>
  Number(Boolean(b.featured)) - Number(Boolean(a.featured))
  || n(b.rating) - n(a.rating)
  || n(b.products_count) - n(a.products_count));

export async function fetchShops() {
  if (configError) throw new Error(configError);
  const { data, error } = await supabase.rpc('public_shops_directory');
  if (error) throw error;
  return sortShops(data);
}

// Catégories présentes, les plus fréquentes d'abord.
export function categoriesOf(shops) {
  const counts = new Map();
  (shops || []).forEach((s) => (s.categories || []).forEach((c) => c && counts.set(c, (counts.get(c) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

export function filterShops(shops, { query = '', category = null } = {}) {
  const q = plain(query.trim());
  return (shops || []).filter((s) => {
    if (category && !(s.categories || []).includes(category)) return false;
    if (!q) return true;
    return plain(`${s.shop_name} ${s.description || ''} ${s.address || ''} ${(s.categories || []).join(' ')}`).includes(q);
  });
}

// Catalogue de la plateforme : produits en ligne des boutiques visibles dans l'application, les plus récents d'abord.
// Chaque produit porte le nom, la couleur et le logo de sa boutique. Gardé pendant l'utilisation (rafraîchi à la demande).
let catalogCache = null;
export async function fetchCatalog(shops, { refresh = false } = {}) {
  if (configError) throw new Error(configError);
  if (catalogCache && !refresh) return catalogCache;
  const names = (shops || []).map((s) => s.shop_name).filter(Boolean);
  if (!names.length) return [];
  const { data: merchants, error } = await supabase.from('merchants').select('id, shop_name, theme_color, logo_url').in('shop_name', names);
  if (error) throw error;
  const byId = new Map((merchants || []).map((m) => [m.id, m]));
  if (!byId.size) return [];
  const { data: rows, error: productsError } = await supabase
    .from('products')
    .select('*')
    .in('merchant_id', [...byId.keys()])
    .order('created_at', { ascending: false })
    .limit(300);
  if (productsError) throw productsError;
  const live = (rows || []).filter((p) => isLive(p));
  // Notes des clients (moyenne et nombre d'avis), pour l'affichage et le tri « Mieux notés ».
  const ratings = {};
  try {
    const { data: reviews } = await supabase.from('reviews').select('product_id, rating').in('product_id', live.slice(0, 300).map((p) => p.id));
    (reviews || []).forEach((r) => {
      const key = String(r.product_id);
      const cur = ratings[key] || { sum: 0, count: 0 };
      ratings[key] = { sum: cur.sum + (Number(r.rating) || 0), count: cur.count + 1 };
    });
  } catch { /* notes facultatives : le catalogue s'affiche sans elles */ }
  catalogCache = live.map((p) => {
    const r = ratings[String(p.id)];
    return { ...p, shop: byId.get(p.merchant_id), ratingInfo: r ? { average: r.sum / r.count, count: r.count } : null };
  });
  return catalogCache;
}

// Tri et filtres de la recherche (écran Explorer).
export const SORTS = [['recent', 'Nouveautés', 'sparkles-outline'], ['price_asc', 'Prix croissant', 'trending-up-outline'], ['price_desc', 'Prix décroissant', 'trending-down-outline'], ['rating', 'Mieux notés', 'star-outline']];
export const PRICES = [['all', 'Tous les prix', 0, Infinity], ['lt5', 'Moins de 5 000 F', 0, 5000], ['5to15', '5 000 à 15 000 F', 5000, 15000], ['gt15', 'Plus de 15 000 F', 15000, Infinity]];
export const DEFAULT_REFINE = { sort: 'recent', price: 'all', inStock: false };

export function refineProducts(products, { sort = 'recent', price = 'all', inStock = false } = {}) {
  const [, , min, max] = PRICES.find(([id]) => id === price) || PRICES[0];
  const list = (products || []).filter((p) => {
    const value = Number(p.price_fcfa) || 0;
    if (value < min || value >= max) return false;
    if (inStock && typeof p.stock === 'number' && p.stock <= 0) return false;
    return true;
  });
  if (sort === 'price_asc') return [...list].sort((a, b) => n(a.price_fcfa) - n(b.price_fcfa));
  if (sort === 'price_desc') return [...list].sort((a, b) => n(b.price_fcfa) - n(a.price_fcfa));
  if (sort === 'rating') return [...list].sort((a, b) => n(b.ratingInfo?.average) - n(a.ratingInfo?.average) || n(b.ratingInfo?.count) - n(a.ratingInfo?.count));
  return list; // Nouveautés : ordre du catalogue (plus récents d'abord)
}

// Nombre de réglages différents de ceux par défaut (pastille du bouton « Filtres »).
export const refineCount = (r) => Number(r.sort !== 'recent') + Number(r.price !== 'all') + Number(Boolean(r.inStock));

export function filterProducts(products, { query = '', category = null } = {}) {
  const q = plain(query.trim());
  return (products || []).filter((p) => {
    if (category && (p.category || 'Autres') !== category) return false;
    if (!q) return true;
    return plain(`${p.name} ${p.category || ''} ${p.description || ''} ${p.shop?.shop_name || ''}`).includes(q);
  });
}
