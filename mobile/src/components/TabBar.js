// Barre d'onglets flottante : verre nuit, coins arrondis, pastille dorée derrière l'onglet actif.
// Au centre, le panier en losange doré surélevé (le geste le plus important de l'application),
// avec le nombre d'articles. Expo Router (SDK 58) fournit emitter et navigateToTab.
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../lib/cart';
import { listOrders } from '../lib/myOrders';
import { buzzLight } from '../lib/feedback';
import { Glass } from './ui';
import { COLORS, GRADIENTS, sheet } from '../theme';

const ICONS = {
  index: ['home-outline', 'home'],
  explorer: ['compass-outline', 'compass'],
  favoris: ['heart-outline', 'heart'],
  paniers: ['bag-handle-outline', 'bag-handle'],
  commandes: ['receipt-outline', 'receipt'],
};
const CENTER = 'paniers';
const native = Platform.OS !== 'web';

function Tab({ label, icons, focused, badge, onPress }) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: focused ? 1 : 0, useNativeDriver: native, speed: 18, bounciness: 8 }).start();
  }, [focused, anim]);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={badge ? `${label}, ${badge}` : label}>
      <View style={styles.iconBox}>
        <Animated.View style={[styles.pill, { opacity: anim, transform: [{ scale }] }]}>
          <LinearGradient colors={GRADIENTS.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pillFill} />
        </Animated.View>
        <Ionicons name={focused ? icons[1] : icons[0]} size={21} color={focused ? COLORS.ctaInk : COLORS.muted} />
        {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
      </View>
      <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// Panier : losange doré qui dépasse de la barre
function CenterTab({ label, focused, badge, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.centerItem} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={badge ? `${label}, ${badge} article${badge > 1 ? 's' : ''}` : label}>
      <View style={styles.centerHalo} />
      <LinearGradient colors={GRADIENTS.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.diamond, focused && styles.diamondOn]}>
        <View style={styles.diamondIcon}>
          <Ionicons name={focused ? 'bag-handle' : 'bag-handle-outline'} size={24} color={COLORS.ctaInk} />
        </View>
      </LinearGradient>
      {badge ? <View style={styles.centerBadge}><Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
      <Text style={[styles.label, styles.centerLabel, focused && styles.labelOn]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export default function TabBar({ state, descriptors, emitter, navigateToTab }) {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const badges = { paniers: cart.totalCount(), commandes: listOrders().length };

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) + 6 }]} pointerEvents="box-none">
      <Glass style={styles.bar} intensity={80}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title || route.name;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event?.defaultPrevented) {
              buzzLight();
              navigateToTab(route.key);
            }
          };
          if (route.name === CENTER) return <CenterTab key={route.key} label={label} focused={focused} badge={badges[route.name] || 0} onPress={onPress} />;
          return <Tab key={route.key} label={label} icons={ICONS[route.name] || ['ellipse-outline', 'ellipse']} focused={focused} badge={badges[route.name] || 0} onPress={onPress} />;
        })}
      </Glass>
    </View>
  );
}

const styles = sheet({
  wrap: {
    position: 'absolute', left: 14, right: 14, borderRadius: 28,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  bar: { flexDirection: 'row', borderRadius: 28, paddingVertical: 8, paddingHorizontal: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'visible' },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconBox: { width: 46, height: 34, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 17, overflow: 'hidden' },
  pillFill: { flex: 1 },
  badge: { position: 'absolute', top: -4, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.brandVivid, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: COLORS.night },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  label: { color: COLORS.muted, fontSize: 10.5, fontWeight: '600' },
  labelOn: { color: COLORS.goldInk, fontWeight: '800' },
  // Panier au centre
  centerItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  centerHalo: { position: 'absolute', top: -30, width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(246,199,104,0.16)' },
  diamond: {
    position: 'absolute', top: -24, width: 52, height: 52, borderRadius: 16, transform: [{ rotate: '45deg' }],
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.night,
    shadowColor: '#f3a953', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  diamondOn: { borderColor: COLORS.goldInk },
  diamondIcon: { transform: [{ rotate: '-45deg' }] },
  centerBadge: { position: 'absolute', top: -30, right: '22%', minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.brandVivid, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: COLORS.night },
  centerLabel: { marginTop: 37 },
});
