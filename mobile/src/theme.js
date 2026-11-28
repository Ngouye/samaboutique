// Identité visuelle de l'application, style « nuit de Dakar » (le même que le site : accueil, annuaire,
// tableaux de bord) : fond nuit, surfaces en verre, accents indigo et or, police Plus Jakarta Sans,
// mots mis en avant en italique Playfair Display.
import { StyleSheet } from 'react-native';

export const COLORS = {
  // Accents
  brand: '#8a7cf1', // indigo lumineux : liens, icônes, pastilles (lisible sur fond nuit)
  brandVivid: '#6a58e8',
  brandSoft: 'rgba(138,124,241,0.16)',
  brandDeep: '#3b2fc9',
  gold: '#f6c768', // mises en avant, appels à l'action
  goldSoft: 'rgba(246,199,104,0.12)',
  goldInk: '#f9d784', // texte doré sur fond nuit
  cta: '#f6c768', // fond des boutons principaux
  ctaInk: '#1a1033', // texte sur fond doré
  // Fonds et surfaces
  night: '#07061a',
  bg: '#0a0820', // fond de l'application
  card: '#14122f', // cartes, panneaux
  raised: '#1d1a45', // éléments posés sur une carte (boutons ronds, puces)
  line: 'rgba(255,255,255,0.09)',
  skeleton: '#1c1a3e',
  // Textes
  ink: '#f5f4ff', // textes forts
  muted: '#a9a5c8',
  faint: '#6f6b94',
  // États
  green: '#34d399',
  greenSoft: 'rgba(52,211,153,0.14)',
  danger: '#f87171',
};

export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28 };

// Sur fond nuit, une ombre seule ne se voit pas : un liseré clair dessine le bord des cartes.
export const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.35,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.07)',
};

// Une famille par graisse : sur Android, une police personnalisée ne se met pas en gras toute seule.
export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  editorial: 'PlayfairDisplay_600SemiBold_Italic', // mots mis en avant dans les titres
};
const BY_WEIGHT = {
  normal: FONTS.regular, 100: FONTS.regular, 200: FONTS.regular, 300: FONTS.regular, 400: FONTS.regular,
  500: FONTS.medium, 600: FONTS.semibold, 700: FONTS.bold, bold: FONTS.bold, 800: FONTS.extrabold, 900: FONTS.extrabold,
};
export const fontFor = (weight) => BY_WEIGHT[String(weight || 400)] || FONTS.regular;

// StyleSheet.create avec la police de SamaBoutik : chaque style de texte (taille ou graisse indiquée)
// reçoit la bonne famille Plus Jakarta Sans selon sa graisse.
export function sheet(styles) {
  const out = {};
  Object.entries(styles).forEach(([name, style]) => {
    if (style && typeof style === 'object' && !style.fontFamily && (style.fontSize != null || style.fontWeight != null)) {
      const { fontWeight, ...rest } = style;
      out[name] = { ...rest, fontFamily: fontFor(fontWeight) };
    } else {
      out[name] = style;
    }
  });
  return StyleSheet.create(out);
}

// Dégradés (en-têtes, boutons, bannières).
export const GRADIENTS = {
  brand: ['#8a7cf1', '#6a58e8', '#3b2fc9'],
  hero: ['#1d1852', '#100d33', '#0a0820'], // en-têtes nuit
  gold: ['#f9d784', '#f3a953', '#ec8a5a'], // boutons principaux
  teal: ['#2dd4bf', '#0f766e'],
  sunset: ['#fbbf24', '#ea580c'],
  rose: ['#f472b6', '#be185d'],
  // Bannières sombres teintées (une lueur de couleur sur fond nuit)
  nightIndigo: ['#2a2380', '#151140', '#0d0b2a'],
  nightTeal: ['#0f4f55', '#0c2c3a', '#0b1426'],
  nightGold: ['#5a3d16', '#2a1d22', '#120e26'],
};

// Couleurs des catégories sur fond nuit (une par position, dans cet ordre).
export const SOFT = [
  { bg: 'rgba(138,124,241,0.16)', fg: '#b3a9fb' },
  { bg: 'rgba(251,146,60,0.15)', fg: '#fdba74' },
  { bg: 'rgba(52,211,153,0.14)', fg: '#6ee7b7' },
  { bg: 'rgba(244,114,182,0.15)', fg: '#f9a8d4' },
  { bg: 'rgba(56,189,248,0.15)', fg: '#7dd3fc' },
  { bg: 'rgba(246,199,104,0.14)', fg: '#f9d784' },
];

// Place laissée en bas des onglets pour la barre flottante.
export const TAB_SPACE = 104;
