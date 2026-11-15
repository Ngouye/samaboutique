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
  catalogCache = (rows || []).filter((p) => isLive(p)).map((p) => ({ ...p, shop: byId.get(p.merchant_id) }));
  return catalogCache;
}

export function filterProducts(products, { query = '', category = null } = {}) {
  const q = plain(query.trim());
  return (products || []).filter((p) => {
    if (category && (p.category || 'Autres') !== category) return false;
    if (!q) return true;
    return plain(`${p.name} ${p.category || ''} ${p.description || ''} ${p.shop?.shop_name || ''}`).includes(q);
  });
}
