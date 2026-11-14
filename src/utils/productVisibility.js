// Visibilité d'un produit pour les clients : brouillon, programmé ou en ligne.
// Colonne `visibility` ajoutée par produits_brouillons.sql ; sans elle, tout produit est en ligne.

// 'live' (visible par les clients) · 'scheduled' (mise en ligne prévue) · 'draft' (invisible)
export function productState(product, now = Date.now()) {
  const v = product?.visibility;
  if (!v || v === 'published') return 'live';
  if (v === 'scheduled') {
    const t = Date.parse(product.publish_at || '');
    return Number.isFinite(t) && t <= now ? 'live' : 'scheduled';
  }
  return 'draft';
}

export const isLive = (product, now = Date.now()) => productState(product, now) === 'live';

// Vérifications avant publication. Les essentielles sont signalées en priorité.
export function publishChecklist(product, { hasImage } = {}) {
  const price = Number(product?.price_fcfa) || 0;
  const description = String(product?.description || '').trim();
  return [
    { id: 'photo', label: 'Une photo du produit', ok: Boolean(hasImage ?? product?.image_url), essential: true },
    { id: 'price', label: 'Un prix', ok: price > 0, essential: true },
    { id: 'description', label: 'Une description d’au moins 30 caractères', ok: description.length >= 30 },
    { id: 'stock', label: 'Du stock disponible', ok: (Number(product?.stock) || 0) > 0 },
    { id: 'category', label: 'Une catégorie', ok: Boolean(product?.category) },
  ];
}

export const missingEssentials = (checklist) => checklist.filter((c) => c.essential && !c.ok);

// Valeur d'un champ « date et heure » (heure locale du téléphone) : « 2026-11-15T09:00 ».
const pad = (n) => String(n).padStart(2, '0');
export function toLocalInput(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Proposition par défaut pour une mise en ligne programmée : demain à 9 h.
export function defaultSchedule(now = Date.now()) {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return toLocalInput(d);
}

// Heure de mise en ligne valable : au moins une minute dans le futur.
export function scheduleError(localValue, now = Date.now()) {
  if (!localValue) return 'Choisissez la date et l’heure de mise en ligne.';
  const t = Date.parse(localValue);
  if (!Number.isFinite(t)) return 'Date invalide.';
  if (t <= now + 60000) return 'Choisissez une heure à venir.';
  return '';
}

// « sam. 15 nov., 09:00 »
export function formatSchedule(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Colonnes à enregistrer selon le choix du commerçant.
export function visibilityPayload(choice, scheduleLocal, previous, now = Date.now()) {
  if (choice === 'draft') return { visibility: 'draft', publish_at: null };
  if (choice === 'scheduled') return { visibility: 'scheduled', publish_at: new Date(scheduleLocal).toISOString() };
  const keepDate = previous && productState(previous, now) === 'live' && previous.published_at;
  return { visibility: 'published', publish_at: null, published_at: keepDate ? previous.published_at : new Date(now).toISOString() };
}

// Choix proposé à l'ouverture d'un produit existant.
export const visibilityChoice = (product) =>
  product?.visibility === 'draft' ? 'draft' : product?.visibility === 'scheduled' ? 'scheduled' : 'published';
