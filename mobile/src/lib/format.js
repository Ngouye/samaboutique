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
