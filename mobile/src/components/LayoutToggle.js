// Bascule d'affichage des produits : grille (2 colonnes) ou liste (1 colonne détaillée).
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { buzzLight } from '../lib/feedback';
import { COLORS, sheet } from '../theme';

const MODES = [['grid', 'grid-outline', 'grille'], ['list', 'list-outline', 'liste']];

export default function LayoutToggle({ value, onChange, style }) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="tablist">
      {MODES.map(([id, icon, label]) => {
        const on = value === id;
        return (
          <Pressable
            key={id}
            onPress={() => { if (!on) { buzzLight(); onChange(id); } }}
            style={[styles.item, on && styles.itemOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Affichage en ${label}`}
            hitSlop={4}
          >
            <Ionicons name={icon} size={16} color={on ? COLORS.ctaInk : COLORS.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = sheet({
  wrap: { flexDirection: 'row', padding: 3, gap: 2, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  item: { width: 34, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  itemOn: { backgroundColor: COLORS.cta },
});
