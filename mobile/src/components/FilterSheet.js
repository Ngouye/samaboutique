// Fenêtre « Trier et filtrer » de la recherche : tri, tranche de prix, produits en stock seulement.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GradientButton } from './ui';
import { DEFAULT_REFINE, PRICES, SORTS, refineProducts } from '../lib/shops';
import { buzzLight } from '../lib/feedback';
import { COLORS, RADIUS, sheet } from '../theme';

// Contenu de la fenêtre : créé à chaque ouverture, il repart des réglages en cours.
function FilterBody({ value, products, onApply, onClose }) {
  const [draft, setDraft] = useState(value);
  const count = refineProducts(products, draft).length;
  const pick = (patch) => { buzzLight(); setDraft((d) => ({ ...d, ...patch })); };

  return (
    <>
      <View style={styles.head}>
        <Text style={styles.title}>Trier et filtrer</Text>
        <Pressable onPress={() => pick(DEFAULT_REFINE)} hitSlop={8}><Text style={styles.reset}>Réinitialiser</Text></Pressable>
      </View>

      <Text style={styles.section}>Trier par</Text>
      <View style={styles.sorts}>
        {SORTS.map(([id, label, icon]) => {
          const on = draft.sort === id;
          return (
            <Pressable key={id} onPress={() => pick({ sort: id })} style={[styles.sort, on && styles.sortOn]} accessibilityState={{ selected: on }}>
              <Ionicons name={icon} size={17} color={on ? COLORS.ctaInk : COLORS.brand} />
              <Text style={[styles.sortText, on && styles.sortTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Prix</Text>
      <View style={styles.prices}>
        {PRICES.map(([id, label]) => {
          const on = draft.price === id;
          return (
            <Pressable key={id} onPress={() => pick({ price: id })} style={[styles.price, on && styles.priceOn]} accessibilityState={{ selected: on }}>
              <Text style={[styles.priceText, on && styles.priceTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.stockRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stockTitle}>En stock seulement</Text>
          <Text style={styles.stockText}>Masquer les produits épuisés</Text>
        </View>
        <Switch
          value={draft.inStock}
          onValueChange={(v) => pick({ inStock: v })}
          trackColor={{ false: COLORS.raised, true: 'rgba(246,199,104,0.55)' }}
          thumbColor={draft.inStock ? COLORS.gold : '#cfcbe8'}
        />
      </View>

      <GradientButton title={count ? `Voir ${count} produit${count > 1 ? 's' : ''}` : 'Aucun produit'} icon="checkmark" disabled={!count} onPress={() => { onApply(draft); onClose(); }} style={{ marginTop: 18 }} />
    </>
  );
}

// products : liste déjà filtrée par la recherche et la catégorie (pour annoncer le nombre de résultats).
export default function FilterSheet({ visible, value, products, onApply, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.handle} />
          {visible ? <FilterBody value={value} products={products} onApply={onApply} onClose={onClose} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = sheet({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4,3,16,0.65)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10,
    borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.1)',
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: COLORS.ink, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  reset: { color: COLORS.brand, fontSize: 14, fontWeight: '800' },
  section: { color: COLORS.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
  sorts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sort: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '48.5%', paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: RADIUS.md, backgroundColor: COLORS.raised, borderWidth: 1, borderColor: COLORS.line,
  },
  sortOn: { backgroundColor: COLORS.cta, borderColor: COLORS.cta },
  sortText: { color: COLORS.ink, fontSize: 13.5, fontWeight: '700' },
  sortTextOn: { color: COLORS.ctaInk, fontWeight: '800' },
  prices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  price: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: COLORS.raised, borderWidth: 1, borderColor: COLORS.line },
  priceOn: { backgroundColor: COLORS.brandSoft, borderColor: COLORS.brand },
  priceText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  priceTextOn: { color: COLORS.ink, fontWeight: '800' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.raised },
  stockTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  stockText: { color: COLORS.muted, fontSize: 12.5, marginTop: 2 },
});
