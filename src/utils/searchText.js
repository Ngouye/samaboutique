// Recherche de la vitrine, tolérante : sans accents ni majuscules (« epices » trouve « Épices »),
// sur le nom, les mots-clés, la catégorie et la description. Chaque mot tapé doit être trouvé quelque part.
export const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function searchScore(product, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const name = normalize(product?.name);
  const category = normalize(product?.category);
  const tags = (Array.isArray(product?.tags) ? product.tags : []).map(normalize);
  const description = normalize(product?.description);
  let score = 0;
  for (const w of words) {
    if (name.startsWith(w) || name.includes(` ${w}`)) score += 6; // début d'un mot du nom
    else if (name.includes(w)) score += 4;
    else if (tags.some((t) => t.includes(w))) score += 3;
    else if (category.includes(w)) score += 2;
    else if (description.includes(w)) score += 1;
    else return 0;
  }
  return score;
}

// Produits trouvés, les plus pertinents d'abord (ordre d'origine conservé à égalité).
export function searchProducts(products, query) {
  return products
    .map((p, i) => [p, searchScore(p, query), i])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || a[2] - b[2])
    .map(([p]) => p);
}

// Tranches de prix proposées dans les filtres, arrondies (ex. « Moins de 7 500 F »).
export function priceBuckets(prices) {
  const sorted = prices.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  if (sorted.length < 3) return [];
  const round = (n) => (n >= 10000 ? Math.round(n / 5000) * 5000 : Math.round(n / 500) * 500);
  const low = round(sorted[Math.floor(sorted.length / 3)]);
  const high = round(sorted[Math.floor((2 * sorted.length) / 3)]);
  if (!(low > 0) || !(high > low)) return [];
  return [
    { id: 'low', label: `Moins de ${low.toLocaleString('fr-FR')} F`, min: null, max: low },
    { id: 'mid', label: `${low.toLocaleString('fr-FR')} – ${high.toLocaleString('fr-FR')} F`, min: low, max: high },
    { id: 'high', label: `Plus de ${high.toLocaleString('fr-FR')} F`, min: high, max: null },
  ];
}

// Filtres du catalogue (prix, disponibilité), en plus de la catégorie, des favoris et de la recherche.
export const NO_FILTERS = { minPrice: null, maxPrice: null, inStock: false };
export const activeFilterCount = (f) => ((f.minPrice != null || f.maxPrice != null) ? 1 : 0) + (f.inStock ? 1 : 0);
export function matchesFilters(product, f) {
  const price = Number(product?.price_fcfa) || 0;
  if (f.minPrice != null && price < f.minPrice) return false;
  if (f.maxPrice != null && price > f.maxPrice) return false;
  if (f.inStock && typeof product?.stock === 'number' && product.stock <= 0) return false;
  return true;
}
