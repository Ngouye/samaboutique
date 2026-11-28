// Éléments de design communs : bouton en dégradé, verre dépoli, apparition animée, pression qui « s'enfonce ».
import { useEffect, useId, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, FONTS, GRADIENTS, RADIUS, sheet } from '../theme';
import { onColor, shade } from '../lib/format';

const native = Platform.OS !== 'web';

// Dégradé à partir d'une couleur de boutique. Sans couleur propre (indigo SamaBoutik), ou avec une couleur
// trop sombre pour se voir sur le fond nuit, le bouton prend l'or de la plateforme.
const DEFAULT_ACCENTS = ['#3b2fc9', COLORS.brand, COLORS.brandDeep];
const tooDark = (hex) => {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 48;
};
export const gradientOf = (accent) => (!accent || DEFAULT_ACCENTS.includes(accent) || tooDark(accent) ? GRADIENTS.gold : [accent, shade(accent, 0.22)]);

// Grand bouton d'action : dégradé, icône, texte, montant à droite.
export function GradientButton({ title, icon, right, onPress, disabled, loading, colors, style, height = 56 }) {
  const fill = colors || GRADIENTS.gold;
  const ink = onColor(fill[0]);
  return (
    <PressScale onPress={onPress} disabled={disabled || loading} style={[{ borderRadius: RADIUS.md + 2, overflow: 'hidden', opacity: disabled ? 0.55 : 1 }, style]}>
      <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.button, { height }]}>
        {loading ? <ActivityIndicator color={ink} /> : icon ? <Ionicons name={icon} size={19} color={ink} /> : null}
        <Text style={[styles.buttonText, { color: ink }]} numberOfLines={1}>{title}</Text>
        {right ? <Text style={[styles.buttonRight, { color: ink }]}>{right}</Text> : null}
      </LinearGradient>
    </PressScale>
  );
}

// Zone qui s'enfonce légèrement quand on appuie (cartes, boutons).
// Les réglages de place dans une rangée (flex, alignSelf…) vont à la zone touchable elle-même,
// pour qu'un bouton puisse s'étirer à côté d'un autre.
const OUTER_KEYS = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf'];
export function PressScale({ children, onPress, onLongPress, disabled, style, scaleTo = 0.97, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: native, speed: 40, bounciness: 6 }).start();
  const flat = StyleSheet.flatten(style) || {};
  const outer = {};
  const inner = { ...flat };
  OUTER_KEYS.forEach((k) => { if (flat[k] !== undefined) { outer[k] = flat[k]; delete inner[k]; } });
  return (
    <Pressable style={outer} onPress={onPress} onLongPress={onLongPress} disabled={disabled} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)} {...rest}>
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// Apparition en fondu, légèrement montante ; delay en millisecondes (cartes l'une après l'autre).
export function FadeIn({ children, delay = 0, from = 16, style }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 420, delay, useNativeDriver: native }).start();
  }, [progress, delay]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

// Verre dépoli : vrai flou sur iPhone, voile nuit translucide sur Android et le web.
export function Glass({ children, style, intensity = 60, tint = 'dark' }) {
  if (Platform.OS === 'ios') {
    return <BlurView intensity={intensity} tint={tint} style={[{ overflow: 'hidden' }, style]}>{children}</BlurView>;
  }
  return <View style={[{ backgroundColor: tint === 'dark' ? 'rgba(20,18,47,0.9)' : 'rgba(255,255,255,0.93)' }, style]}>{children}</View>;
}

// Lueur douce (dégradé circulaire qui s'efface), identique sur iPhone, Android et le web.
// À placer en position absolue dans un en-tête ou une bannière : style={{ top: -80, right: -60 }}.
export function Glow({ color = COLORS.brandVivid, size = 280, opacity = 0.45, style }) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// Mot mis en avant dans un titre : italique Playfair Display doré, comme sur le site.
export function Editorial({ children, style }) {
  return <Text style={[{ fontFamily: FONTS.editorial, color: COLORS.goldInk, fontWeight: 'normal', letterSpacing: -0.3 }, style]}>{children}</Text>;
}

// Titre de section avec lien « Tout voir ».
export function SectionHeader({ title, action, onAction, style, icon, colors }) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionLeft}>
        {icon ? (
          <LinearGradient colors={colors || GRADIENTS.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sectionIcon}>
            <Ionicons name={icon} size={15} color="#fff" />
          </LinearGradient>
        ) : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="arrow-forward" size={13} color={COLORS.goldInk} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = sheet({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  buttonText: { flex: 1, fontSize: 16, fontWeight: '800' },
  buttonRight: { fontSize: 17, fontWeight: '800' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 28, marginBottom: 14 },
  sectionTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionAction: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionActionText: { color: COLORS.ink, fontSize: 12.5, fontWeight: '800' },
});
