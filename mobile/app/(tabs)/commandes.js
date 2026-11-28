// Mes commandes : commandes passées depuis ce téléphone, avec leur état du moment.
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { listOrders, removeOrder, sinceLabel, statusInfo, trackOrder } from '../../src/lib/myOrders';
import { fmt } from '../../src/lib/format';
import { productsOfOrder, reviewedIn } from '../../src/lib/reviews';
import { COLORS, RADIUS, SHADOW, sheet, TAB_SPACE } from '../../src/theme';

const TONES = {
  brand: { bg: COLORS.brandSoft, fg: COLORS.brand },
  gold: { bg: COLORS.goldSoft, fg: COLORS.goldInk },
  green: { bg: COLORS.greenSoft, fg: COLORS.green },
  red: { bg: 'rgba(248,113,113,0.14)', fg: COLORS.danger },
};

export default function MyOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState(() => listOrders());
  const [states, setStates] = useState({}); // { id: commande à jour }
  const [refreshing, setRefreshing] = useState(false);

  // État du moment des 8 commandes les plus récentes (une demande chacune).
  const loadStates = useCallback(async (list) => {
    const results = await Promise.all(list.slice(0, 8).map((o) => trackOrder(o).then((r) => [o.id, r.ok ? r.order : null])));
    setStates((prev) => ({ ...prev, ...Object.fromEntries(results.filter(([, order]) => order)) }));
  }, []);

  useFocusEffect(useCallback(() => {
    const list = listOrders();
    setOrders(list);
    loadStates(list);
  }, [loadStates]));

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const list = listOrders();
    setOrders(list);
    await loadStates(list);
    setRefreshing(false);
  }, [loadStates]);

  const forget = (item) => Alert.alert(
    'Retirer cette commande ?',
    `La commande n° ${item.id.split('-')[0].toUpperCase()} de ${item.shop} ne s’affichera plus sur ce téléphone. Elle n’est pas annulée.`,
    [{ text: 'Garder', style: 'cancel' }, { text: 'Retirer', style: 'destructive', onPress: () => { removeOrder(item.id); setOrders(listOrders()); } }],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Mes commandes</Text>
        <Text style={styles.subtitle}>Passées depuis ce téléphone, avec leur suivi en direct</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingBottom: TAB_SPACE + insets.bottom, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor={COLORS.brand} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={36} color={COLORS.brand} /></View>
            <Text style={styles.emptyTitle}>Aucune commande pour l’instant</Text>
            <Text style={styles.emptyText}>Les commandes passées depuis ce téléphone apparaîtront ici, avec leur suivi en direct.</Text>
            <Pressable onPress={() => router.navigate('/')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Découvrir les boutiques</Text></Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const live = states[item.id];
          const info = live ? statusInfo(live) : null;
          const tone = info ? TONES[info.tone] : null;
          const toReview = live?.status === 'DELIVERED' ? productsOfOrder(live).filter((p) => !reviewedIn(item.id).includes(p.id)).length : 0;
          return (
            <Pressable onPress={() => router.push({ pathname: '/suivi/[id]', params: { id: item.id } })} onLongPress={() => forget(item)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
              <View style={styles.cardTop}>
                <Text style={styles.shop} numberOfLines={1}>{item.shop}</Text>
                {info ? (
                  <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                    <Ionicons name={info.icon} size={12} color={tone.fg} />
                    <Text style={[styles.badgeText, { color: tone.fg }]}>{info.label}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.meta}>N° {item.id.split('-')[0].toUpperCase()} · {sinceLabel(item.at)} · {item.items} article{item.items > 1 ? 's' : ''}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.total}>{fmt(item.total)} F</Text>
                {toReview ? (
                  <View style={styles.reviewChip}><Ionicons name="star" size={12} color={COLORS.ctaInk} /><Text style={styles.reviewChipText}>Donnez votre avis</Text></View>
                ) : null}
                <View style={styles.trackLink}>
                  <Text style={styles.trackText}>{live?.status === 'DELIVERED' ? 'Détails' : 'Suivre'}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.brand} />
                </View>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={orders.length ? <Text style={styles.hint}>Appui long sur une commande pour la retirer de cette liste.</Text> : null}
      />
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  title: { color: COLORS.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 2 },
  emptyIcon: { width: 86, height: 86, borderRadius: 30, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 12, ...SHADOW, shadowOpacity: 0.05 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shop: { flex: 1, color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  meta: { color: COLORS.muted, fontSize: 12.5, marginTop: 4 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  total: { color: COLORS.ink, fontSize: 17, fontWeight: '900' },
  trackLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.cta, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginLeft: 'auto', marginRight: 10 },
  reviewChipText: { color: COLORS.ctaInk, fontSize: 12, fontWeight: '800' },
  trackText: { color: COLORS.brand, fontWeight: '800', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900', marginTop: 12 },
  emptyText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  emptyButton: { marginTop: 18, backgroundColor: COLORS.cta, paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.md },
  emptyButtonText: { color: COLORS.ctaInk, fontWeight: '800', fontSize: 15 },
  hint: { color: COLORS.faint, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
