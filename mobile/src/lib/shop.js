// Une boutique : fiche publique, produits en ligne, notes des clients, zones de livraison.
// Mêmes lectures que la vitrine du site (src/pages/PublicShop.jsx).
import { supabase, configError } from './supabase';
import { isLive } from './shared';

// Colonnes publiques de la fiche boutique (les autres sont réservées au commerçant).
const MERCHANT_COLUMNS = 'id, shop_name, phone_number, address, logo_url, banner_url, description, theme_color, social_links, delivery_zones';

// Zones utilisées quand le commerçant n'a rien réglé (mêmes valeurs que la base et le site).
export const DEFAULT_ZONES = [
  { name: 'Dakar Plateau / Médina', price: 1000, active: true },
  { name: 'Almadies / Ngor / Ouakam', price: 1500, active: true },
  { name: 'Mermoz / Sacré-Cœur / Point E', price: 1500, active: true },
  { name: 'Yoff / Parcelles Assainies', price: 2000, active: true },
  { name: 'Pikine / Guédiawaye', price: 2500, active: true },
  { name: 'Rufisque / Keur Massar / Diamniadio', price: 3000, active: true },
];

export const zonesOf = (merchant) => {
  const zones = Array.isArray(merchant?.delivery_zones) && merchant.delivery_zones.length ? merchant.delivery_zones : DEFAULT_ZONES;
  return zones.filter((z) => z.active).sort((a, b) => Number(a.price) - Number(b.price));
};

// « 100 % » ou « _ » dans un nom de boutique ne doivent pas servir de joker dans la recherche.
const escapeLike = (text) => String(text).replace(/[%_\\]/g, (c) => `\\${c}`);

// Renvoie null si la boutique n'existe pas.
export async function fetchShop(name) {
  if (configError) throw new Error(configError);
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select(MERCHANT_COLUMNS)
    .ilike('shop_name', escapeLike(name))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!merchant) return null;

  const { data: rows, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false });
  if (productsError) throw productsError;
  // Brouillons et produits programmés plus tard restent cachés, comme sur la vitrine du site.
  const products = (rows || []).filter((p) => isLive(p));

  // Notes : moyenne par produit et pour toute la boutique.
  const ratings = {};
  let sum = 0;
  let count = 0;
  if (products.length) {
    const { data: reviews } = await supabase.from('reviews').select('product_id, rating').in('product_id', products.slice(0, 200).map((p) => p.id));
    (reviews || []).forEach((r) => {
      const value = Number(r.rating) || 0;
      const entry = ratings[r.product_id] || (ratings[r.product_id] = { sum: 0, count: 0 });
      entry.sum += value;
      entry.count += 1;
      sum += value;
      count += 1;
    });
  }
  Object.values(ratings).forEach((e) => { e.average = e.sum / e.count; });

  return { merchant, products, ratings, shopRating: count ? { average: sum / count, count } : null };
}

// Catégories des produits, les plus fournies d'abord.
export function productCategories(products) {
  const counts = new Map();
  (products || []).forEach((p) => { const c = p.category || 'Autres'; counts.set(c, (counts.get(c) || 0) + 1); });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

export const isSoldOut = (p) => typeof p?.stock === 'number' && p.stock <= 0;
export const isLowStock = (p) => typeof p?.stock === 'number' && p.stock > 0 && p.stock <= 3;

// Produits et boutiques déjà chargés : les écrans suivants s'affichent aussitôt, puis se mettent à jour.
const productCache = new Map();
const merchantCache = new Map();
export function rememberShop(merchant, products) {
  if (merchant?.shop_name) merchantCache.set(merchant.shop_name, merchant);
  (products || []).forEach((p) => productCache.set(String(p.id), { product: p, merchant }));
}
export const cachedMerchant = (shopName) => merchantCache.get(String(shopName)) || null;
export const cachedProduct = (id) => productCache.get(String(id)) || null;
// Produit venant du catalogue (accueil, Explorer) : sa boutique n'a que nom, couleur et logo.
export const rememberProduct = (product, shop) => productCache.set(String(product.id), { product, merchant: shop || null });

// Photos d'un produit : principale, puis supplémentaires (mêmes champs que la fiche du site).
export function galleryOf(product) {
  if (!product) return [];
  const extra = Array.isArray(product.images) ? product.images : [];
  const fromVariants = product.variants && typeof product.variants === 'object' && Array.isArray(product.variants.images) ? product.variants.images : [];
  return [...new Set([product.image_url, ...extra, ...fromVariants].filter(Boolean))];
}

// Fiche produit à jour, sa boutique et les avis des clients. null si le produit n'est plus en vente.
export async function fetchProduct(id) {
  if (configError) throw new Error(configError);
  const { data: product, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!product || !isLive(product)) return null;

  let merchant = cachedProduct(id)?.merchant || null;
  if (!merchant || merchant.id !== product.merchant_id) {
    const { data } = await supabase.from('merchants').select(MERCHANT_COLUMNS).eq('id', product.merchant_id).maybeSingle();
    merchant = data;
  }
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, product_id, rating, comment, customer_name, verified, created_at')
    .eq('product_id', id)
    .order('created_at', { ascending: false })
    .limit(30);
  productCache.set(String(id), { product, merchant });
  return { product, merchant, reviews: reviews || [] };
}
