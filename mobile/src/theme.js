// Identité visuelle de l'application : couleurs (mêmes valeurs que le site, src/utils/brand.js et src/index.css),
// police Plus Jakarta Sans (celle du site), rayons et ombres.
import { StyleSheet } from 'react-native';

export const COLORS = {
  brand: '#3b2fc9', // indigo signature
  brandVivid: '#6a58e8',
  brandSoft: '#f2f1fe',
  brandDeep: '#2a2580',
  ink: '#12103a', // bleu nuit : textes forts
  night: '#0b0a26',
  gold: '#e8a33d', // mises en avant
  goldSoft: '#fdf3e2',
  goldInk: '#8a5a12',
  bg: '#f7f6f2', // fond crème de la plateforme
  card: '#ffffff',
  line: '#ebe8e1',
  muted: '#78716c',
  faint: '#a8a29e',
  skeleton: '#ebe7df',
  green: '#13723f',
  greenSoft: '#e8f7ee',
  danger: '#b42318',
};

export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28 };

export const SHADOW = {
  shadowColor: '#12103a',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

// Une famille par graisse : sur Android, une police personnalisée ne se met pas en gras toute seule.
export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
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

// Dégradés de la marque (en-têtes, boutons, bannières).
export const GRADIENTS = {
  brand: ['#5b4bf0', '#3b2fc9', '#2a2580'],
  hero: ['#4c3de8', '#3b2fc9', '#221d73'],
  gold: ['#f7cf7a', '#e8a33d'],
  teal: ['#14b8a6', '#0e7c86'],
  sunset: ['#f59e0b', '#ea580c'],
  rose: ['#ec4899', '#9d174d'],
};

// Couleurs douces des catégories (une par position, dans cet ordre).
export const SOFT = [
  { bg: '#eef0ff', fg: '#3b2fc9' },
  { bg: '#fff1e6', fg: '#d4671f' },
  { bg: '#e8f8f1', fg: '#13895a' },
  { bg: '#fdeef4', fg: '#c2357a' },
  { bg: '#e9f6fd', fg: '#1479b8' },
  { bg: '#fff8e1', fg: '#a57400' },
];

// Place laissée en bas des onglets pour la barre flottante.
export const TAB_SPACE = 104;
