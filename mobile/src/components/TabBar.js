// Barre d'onglets du bas : icône pleine et pastille indigo sur l'onglet actif, nombre d'articles et de commandes.
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../lib/cart';
import { listOrders } from '../lib/myOrders';
import { buzzLight } from '../lib/feedback';
import { COLORS, SHADOW, sheet } from '../theme';

const ICONS = {
  index: ['home-outline', 'home'],
  explorer: ['search-outline', 'search'],
  paniers: ['bag-handle-outline', 'bag-handle'],
  commandes: ['receipt-outline', 'receipt'],
};

// Expo Router (SDK 58) fournit emitter et navigateToTab à la barre d'onglets personnalisée.
export default function TabBar({ state, descriptors, emitter, navigateToTab }) {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const badges = { paniers: cart.totalCount(), commandes: listOrders().length };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title || route.name;
        const [outline, filled] = ICONS[route.name] || ['ellipse-outline', 'ellipse'];
        const badge = badges[route.name] || 0;
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event?.defaultPrevented) {
            buzzLight();
            navigateToTab(route.key);
          }
        };
        return (
          <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={badge ? `${label}, ${badge}` : label}>
            <View style={[styles.pill, focused && styles.pillOn]}>
              <Ionicons name={focused ? filled : outline} size={22} color={focused ? COLORS.brand : COLORS.muted} />
              {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
            </View>
            <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = sheet({
  bar: {
    flexDirection: 'row', backgroundColor: COLORS.card, paddingTop: 8, paddingHorizontal: 8,
    borderTopLeftRadius: 22, borderTopRightRadius: 22, ...SHADOW, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  pill: { width: 58, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: COLORS.brandSoft },
  badge: { position: 'absolute', top: -2, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: COLORS.card },
  badgeText: { color: COLORS.ink, fontSize: 10, fontWeight: '800' },
  label: { color: COLORS.muted, fontSize: 11.5, fontWeight: '600' },
  labelOn: { color: COLORS.brand, fontWeight: '800' },
});
