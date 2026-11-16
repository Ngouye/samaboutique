// Éléments de design communs : bouton en dégradé, verre dépoli, apparition animée, pression qui « s'enfonce ».
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, GRADIENTS, RADIUS, sheet } from '../theme';
import { onColor, shade } from '../lib/format';

const native = Platform.OS !== 'web';

// Dégradé à partir d'une couleur de boutique (indigo SamaBoutik par défaut).
export const gradientOf = (accent) => (!accent || accent === COLORS.brand ? GRADIENTS.brand : [accent, shade(accent, 0.22)]);

// Grand bouton d'action : dégradé, icône, texte, montant à droite.
export function GradientButton({ title, icon, right, onPress, disabled, loading, colors, style, height = 56 }) {
  const fill = colors || GRADIENTS.brand;
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
export function PressScale({ children, onPress, onLongPress, disabled, style, scaleTo = 0.97, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: native, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={disabled} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
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

// Verre dépoli : vrai flou sur iPhone, voile blanc translucide sur Android et le web.
export function Glass({ children, style, intensity = 60, tint = 'light' }) {
  if (Platform.OS === 'ios') {
    return <BlurView intensity={intensity} tint={tint} style={[{ overflow: 'hidden' }, style]}>{children}</BlurView>;
  }
  return <View style={[{ backgroundColor: tint === 'dark' ? 'rgba(18,16,58,0.82)' : 'rgba(255,255,255,0.93)' }, style]}>{children}</View>;
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
          <View style={styles.sectionArrow}><Ionicons name="arrow-forward" size={13} color={COLORS.brand} /></View>
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
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionActionText: { color: COLORS.brand, fontSize: 13.5, fontWeight: '700' },
  sectionArrow: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
});
