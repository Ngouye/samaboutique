// Mise en forme : montants, notes, miniatures d'images, recherche sans accents.

// 12 500 (espace comme séparateur des milliers, comme sur le site)
export const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// 4,8
export const ratingLabel = (r) => (Number(r) || 0).toFixed(1).replace('.', ',');

// Photos envoyées par la plateforme : une miniature « .thumb » existe à côté de chaque image
// (même règle que src/utils/imageUpload.js du site).
const UUID_IMAGE = /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(webp|jpg)$/i;
export const thumbUrl = (url) => (url && UUID_IMAGE.test(url) ? url.replace(UUID_IMAGE, '/$1.thumb.$2') : url);

// « Médina » et « medina » se trouvent l'un l'autre.
export function plain(text) {
  const s = String(text || '').toLowerCase();
  return typeof s.normalize === 'function' ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
}

// Initiales d'une boutique sans logo : « Chez Awa » → « CA »
export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// Couleur de la boutique (« #c9a24a ») ; l'indigo SamaBoutik si elle manque ou est invalide.
export const accentOf = (hex, fallback = '#3b2fc9') => (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(hex || '')) ? hex : fallback);

// Texte lisible sur une couleur : blanc sur les couleurs foncées, bleu nuit sur les claires (doré, jaune…).
export function onColor(hex) {
  let h = accentOf(hex).slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (1.05) / (luminance + 0.05) >= 3 ? '#ffffff' : '#12103a';
}

// Couleur assombrie (dégradés des boutons à la couleur d'une boutique) : 0.2 = 20 % plus sombre.
export function shade(hex, amount = 0.2) {
  let h = accentOf(hex).slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const parts = [0, 2, 4].map((i) => Math.max(0, Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - amount))));
  return `#${parts.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Pastille d'une couleur de produit à partir de son nom (« Noir », « bleu marine », « Doré »…).
// Renvoie un code couleur, « multi » pour multicolore, ou null si la couleur n'est pas reconnue.
const SWATCHES = [
  [/multi|imprime|wax|motif/, 'multi'],
  [/bleu marine|marine/, '#1d2b5c'], [/bleu ciel|ciel/, '#7cc3ef'], [/turquoise/, '#2cc4c0'], [/bleu/, '#2f6fe0'],
  [/noir/, '#141414'], [/blanc/, '#f4f4f2'], [/ivoire|creme/, '#efe3c8'], [/beige|nude|sable/, '#d6c09c'], [/camel/, '#c19a6b'],
  [/gris/, '#8a8a8f'], [/argent/, '#c3c7cf'], [/orange|corail/, '#f08a24'], [/bordeaux/, '#7b1e2b'], [/\bdore\b|\bor\b/, '#d4af37'],
  [/jaune|moutarde/, '#f2c230'], [/rouge/, '#d7263d'], [/fuchsia/, '#d6338f'], [/rose/, '#ec7fa9'], [/violet|prune/, '#7d4cc9'], [/mauve|lilas/, '#b28dd6'],
  [/kaki|olive/, '#74783f'], [/vert/, '#2f9e5b'], [/marron|chocolat|brun/, '#6b4226'],
];
export function swatchOf(name) {
  const n = plain(name);
  const hit = SWATCHES.find(([re]) => re.test(n));
  return hit ? hit[1] : null;
}
