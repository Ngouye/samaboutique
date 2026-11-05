// Thèmes des vitrines. Les couleurs de chaque thème sont dans index.css ([data-shop-theme="…"]) ;
// ici : la fiche de présentation (sélecteur du tableau de bord) et les couleurs dérivées
// de la couleur principale, que le marchand peut personnaliser.

const banner = (id) => ({
  src: `/images/themes/${id}.webp`,
  srcSet: `/images/themes/${id}-640.webp 640w, /images/themes/${id}-1024.webp 1024w, /images/themes/${id}.webp 1600w`,
});

export const SHOP_THEMES = [
  {
    id: 'emeraude',
    name: 'Émeraude',
    style: 'Vert et blanc, élégant',
    idealFor: 'Tout commerce',
    accent: '#059669',
    font: 'Plus Jakarta Sans',
    preview: { bg: '#f6f8f7', panel: '#0b1f17', ink: '#0b1f17' },
    banner: banner('emeraude'),
  },
  {
    id: 'minuit',
    name: 'Minuit',
    style: 'Noir et or, luxe',
    idealFor: 'Bijoux, parfums',
    accent: '#c9a24a',
    font: 'Playfair Display',
    dark: true,
    preview: { bg: '#0b0b0c', panel: '#050505', ink: '#f4efe6' },
    banner: banner('minuit'),
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    style: 'Tons chauds, esprit wax',
    idealFor: 'Mode, couture',
    accent: '#c2410c',
    font: 'DM Serif Display',
    preview: { bg: '#fbf5ef', panel: '#3b1d12', ink: '#3b1d12' },
    banner: banner('terracotta'),
  },
  {
    id: 'ocean',
    name: 'Océan',
    style: 'Bleu et blanc, net',
    idealFor: 'Électronique',
    accent: '#0284c7',
    font: 'Space Grotesk',
    preview: { bg: '#f4f8fb', panel: '#0c2340', ink: '#0c2340' },
    banner: banner('ocean'),
  },
  {
    id: 'rose',
    name: 'Rose poudré',
    style: 'Doux et raffiné',
    idealFor: 'Beauté, cosmétiques',
    accent: '#b4436c',
    font: 'Playfair Display',
    fontStyle: 'italic',
    light: true,
    preview: { bg: '#fdf6f7', panel: '#3f1d2b', ink: '#3f1d2b' },
    banner: banner('rose'),
  },
  {
    id: 'epure',
    name: 'Épure',
    style: 'Noir et blanc, minimal',
    idealFor: 'Créateurs, concept stores',
    accent: '#0a0a0a',
    font: 'Plus Jakarta Sans',
    uppercase: true,
    light: true,
    preview: { bg: '#ffffff', panel: '#0a0a0a', ink: '#0a0a0a' },
    banner: banner('epure'),
  },
];

export const DEFAULT_THEME_ID = 'emeraude';

// Les anciens styles (« modern », « classic », « minimalist ») et les valeurs inconnues
// retombent sur Émeraude.
export const getShopTheme = (id) => SHOP_THEMES.find((t) => t.id === id) || SHOP_THEMES[0];
export const isThemeId = (id) => SHOP_THEMES.some((t) => t.id === id);

// Thème choisi sur la page d'accueil, appliqué à la première ouverture du tableau de bord.
export const PENDING_THEME_KEY = 'samaboutik:theme-choisi';

/* ----------------------------- Couleurs ----------------------------- */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const toRgb = (hex) => {
  const h = HEX.exec(hex || '')?.[1];
  if (!h) return null;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

const mix = (rgb, target, amount) => rgb.map((v, i) => v + (target[i] - v) * amount);

// Luminance relative (WCAG), de 0 (noir) à 1 (blanc).
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Éclaircit (vers le blanc) ou fonce (vers le noir) jusqu'à un contraste suffisant avec le fond.
const readableOn = (rgb, background, minimum) => {
  const target = luminance(background) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  let color = rgb;
  for (let step = 0; step < 10 && contrast(color, background) < minimum; step++) color = mix(color, target, 0.15);
  return toHex(color);
};

const PANEL = { emeraude: '#0b1f17', minuit: '#050505', terracotta: '#3b1d12', ocean: '#0c2340', rose: '#3f1d2b', epure: '#0a0a0a' };
const SURFACE = { minuit: '#151517', terracotta: '#fffdfa' };

// Variables CSS posées sur la vitrine : couleur principale, texte lisible posé dessus,
// et version de la couleur assez contrastée pour du texte sur les fonds du thème.
export function themeStyle(theme, accentHex) {
  const accent = toRgb(accentHex) || toRgb(theme.accent);
  const surface = toRgb(SURFACE[theme.id] || '#ffffff');
  const panel = toRgb(PANEL[theme.id] || '#0b1f17');
  const accentText = readableOn(accent, surface, 3.2);
  // Couleur presque identique au fond sombre (ex. noir sur noir) : blanc.
  const panelAccent = contrast(accent, panel) < 1.6 ? '#ffffff' : readableOn(accent, panel, 3.2);
  return {
    '--shop': toHex(accent),
    '--shop-on': contrast(accent, [255, 255, 255]) >= 3 ? '#ffffff' : '#111111',
    '--shop-accent-text': accentText,
    '--shop-accent-page': accentText,
    '--shop-panel-accent': panelAccent,
    '--shop-panel-on': contrast(toRgb(panelAccent), [255, 255, 255]) >= 3 ? '#ffffff' : '#111111',
  };
}
