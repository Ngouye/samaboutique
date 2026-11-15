// Suivi d'une commande : étapes, livreur en route (téléphone et position), code de livraison, montants.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TRACK_STEPS, findOrder, sinceLabel, statusInfo, trackOrder } from '../../src/lib/myOrders';
import { cachedMerchant, fetchShop, rememberShop } from '../../src/lib/shop';
import { MOBILE_CHANNELS, depositAmount, isDeposit, whatsappNumber } from '../../src/lib/shared';
import { fmt } from '../../src/lib/format';
import { COLORS, RADIUS, SHADOW, sheet } from '../../src/theme';

const REFRESH_MS = 15000; // actualisation tant que la commande n'est pas terminée
const TONES = {
  brand: { bg: COLORS.brandSoft, fg: COLORS.brand },
  gold: { bg: COLORS.goldSoft, fg: COLORS.goldInk },
  green: { bg: '#e8f7ee', fg: '#13723f' },
  red: { bg: '#fdecea', fg: COLORS.danger },
};

export default function TrackScreen() {
  const { id } = useLocalSearchParams();
  const orderId = String(id || '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entry = findOrder(orderId);

  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [merchant, setMerchant] = useState(() => (entry ? cachedMerchant(entry.shop) : null));
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!entry) return;
    const result = await trackOrder(entry);
    setNow(Date.now());
    if (result.ok) { setOrder(result.order); setError(''); } else setError(result.error);
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const finished = ['DELIVERED', 'CANCELLED'].includes(order?.status);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (finished) return undefined;
    const timer = setInterval(load, REFRESH_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [finished, load]);

  // Coordonnées de la boutique (bouton WhatsApp).
  useEffect(() => {
    if (merchant || !entry?.shop) return;
    fetchShop(entry.shop).then((data) => { if (data) { rememberShop(data.merchant, data.products); setMerchant(data.merchant); } }).catch(() => {});
  }, [merchant, entry?.shop]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  const goBack = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/commandes')), [router]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={goBack} style={styles.round} accessibilityLabel="Retour" hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Suivi de commande</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{entry ? `${entry.shop} · n° ${orderId.split('-')[0].toUpperCase()}` : ''}</Text>
      </View>
    </View>
  );

  if (!entry) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={46} color={COLORS.faint} />
          <Text style={styles.centerTitle}>Commande inconnue sur ce téléphone</Text>
          <Pressable onPress={() => router.replace('/commandes')} style={styles.secondary}><Text style={styles.secondaryText}>Mes commandes</Text></Pressable>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.center}>
          {error ? (
            <>
              <Ionicons name="cloud-offline-outline" size={44} color={COLORS.faint} />
              <Text style={styles.centerTitle}>{error}</Text>
              <Pressable onPress={load} style={styles.secondary}><Text style={styles.secondaryText}>Réessayer</Text></Pressable>
            </>
          ) : <ActivityIndicator size="large" color={COLORS.brand} />}
        </View>
      </View>
    );
  }

  const info = statusInfo(order);
  const tone = TONES[info.tone];
  const stepIndex = TRACK_STEPS.findIndex((s) => s.id === order.status);
  const showSteps = !['CANCELLED', 'DISPUTED'].includes(order.status);
  const total = Number(order.total_amount_fcfa) || 0;
  const deposit = depositAmount(order);
  const channel = MOBILE_CHANNELS.find((c) => c.id === order.payment_channel);
  const items = order.cart_items || [];
  const itemsTotal = items.reduce((n, it) => n + it.price * it.quantity, 0);
  const address = String(order.customer_address || '').split(' || GPS: ')[0];
  const position = order.driver_position;
  const shopPhone = whatsappNumber(merchant?.phone_number);
  const driverPhone = order.driver_phone ? whatsappNumber(order.driver_phone) : '';

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor={COLORS.brand} />}
      >
        {/* Statut */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, { backgroundColor: tone.bg }]}><Ionicons name={info.icon} size={26} color={tone.fg} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: tone.fg }]}>{info.label}</Text>
              <Text style={styles.statusSub}>{info.sub}</Text>
            </View>
          </View>
          {showSteps ? (
            <View style={styles.steps}>
              {TRACK_STEPS.map((s, i) => {
                const done = stepIndex >= i;
                const current = stepIndex === i;
                return (
                  <View key={s.id} style={styles.step}>
                    <View style={[styles.stepDot, done && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }, current && styles.stepCurrent]}>
                      <Ionicons name={done ? 'checkmark' : s.icon} size={15} color={done ? '#fff' : COLORS.faint} />
                    </View>
                    {i < TRACK_STEPS.length - 1 ? <View style={[styles.stepBar, stepIndex > i && { backgroundColor: COLORS.brand }]} /> : null}
                    <Text style={[styles.stepLabel, done && { color: COLORS.ink }]}>{s.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          <Text style={styles.updated}>Mis à jour {sinceLabel(new Date(now).toISOString(), Date.now()) || 'à l’instant'} · tirez vers le bas pour actualiser</Text>
        </View>

        {/* Livreur en route */}
        {order.status === 'IN_TRANSIT' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Votre livreur</Text>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}><Ionicons name="bicycle" size={22} color={COLORS.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{order.driver_name || 'Livreur de la boutique'}</Text>
                <Text style={styles.driverSub}>{position?.updated_at ? `Position partagée ${sinceLabel(position.updated_at)}` : 'Position pas encore partagée'}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              {driverPhone ? (
                <Pressable onPress={() => Linking.openURL(`tel:+${driverPhone}`)} style={styles.action}>
                  <Ionicons name="call-outline" size={18} color={COLORS.ink} /><Text style={styles.actionText}>Appeler</Text>
                </Pressable>
              ) : null}
              {position?.lat != null ? (
                <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`)} style={styles.action}>
                  <Ionicons name="map-outline" size={18} color={COLORS.ink} /><Text style={styles.actionText}>Voir sur la carte</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Code de livraison */}
        {!['DELIVERED', 'CANCELLED'].includes(order.status) && order.delivery_pin ? (
          <View style={[styles.card, styles.pinCard]}>
            <Text style={styles.pinLabel}>CODE SECRET DE LIVRAISON</Text>
            <Text style={styles.pin}>{order.delivery_pin}</Text>
            <Text style={styles.pinHelp}>Donnez ce code au livreur seulement quand vous avez reçu votre colis.</Text>
          </View>
        ) : null}

        {/* Montants */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Votre commande</Text>
          {items.map((it, i) => (
            <View key={`${it.product_id}-${i}`} style={styles.row}>
              <Text style={styles.rowLabel} numberOfLines={2}>{it.quantity} × {it.name}</Text>
              <Text style={styles.rowValue}>{fmt(it.price * it.quantity)} F</Text>
            </View>
          ))}
          <View style={styles.row}><Text style={styles.rowLabel}>Livraison · {order.delivery_zone}</Text><Text style={styles.rowValue}>{fmt(Math.max(0, total - itemsTotal))} F</Text></View>
          <View style={[styles.row, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{fmt(total)} F</Text></View>
          {isDeposit(order) ? (
            <>
              <View style={styles.row}><Text style={styles.rowLabel}>Acompte payé{channel ? ` (${channel.label})` : ''}</Text><Text style={styles.rowValue}>− {fmt(deposit)} F</Text></View>
              <View style={styles.row}><Text style={styles.dueLabel}>{order.status === 'DELIVERED' ? 'Payé au livreur' : 'À payer au livreur'}</Text><Text style={styles.dueValue}>{fmt(total - deposit)} F</Text></View>
            </>
          ) : order.payment_method === 'MOBILE_MONEY' ? (
            <View style={styles.row}><Text style={styles.rowLabel}>Payé en ligne{channel ? ` (${channel.label})` : ''}</Text><Text style={styles.rowValue}>{fmt(total)} F</Text></View>
          ) : (
            <View style={styles.row}><Text style={styles.dueLabel}>{order.status === 'DELIVERED' ? 'Payé à la livraison' : 'À payer à la livraison'}</Text><Text style={styles.dueValue}>{fmt(total)} F</Text></View>
          )}
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color={COLORS.muted} />
            <Text style={styles.address}>{address}</Text>
          </View>
        </View>

        {shopPhone ? (
          <Pressable onPress={() => Linking.openURL(`https://wa.me/${shopPhone}?text=${encodeURIComponent(`Bonjour ${entry.shop}, je vous écris au sujet de ma commande n° ${orderId.split('-')[0].toUpperCase()}.`)}`)} style={styles.whatsapp}>
            <Ionicons name="logo-whatsapp" size={19} color="#fff" />
            <Text style={styles.whatsappText}>Écrire à la boutique</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  title: { color: COLORS.ink, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  centerTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOW, shadowOpacity: 0.05 },
  cardTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '900', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { fontSize: 21, fontWeight: '900', letterSpacing: -0.3 },
  statusSub: { color: COLORS.muted, fontSize: 13.5, marginTop: 2 },
  steps: { flexDirection: 'row', marginTop: 20 },
  step: { flex: 1, alignItems: 'center' },
  stepDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stepCurrent: { transform: [{ scale: 1.12 }] },
  stepBar: { position: 'absolute', top: 15, left: '50%', width: '100%', height: 3, backgroundColor: COLORS.line },
  stepLabel: { color: COLORS.faint, fontSize: 11.5, fontWeight: '800', marginTop: 6 },
  updated: { color: COLORS.faint, fontSize: 11.5, textAlign: 'center', marginTop: 14 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  driverName: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  driverSub: { color: COLORS.muted, fontSize: 12.5, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, height: 46, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionText: { color: COLORS.ink, fontWeight: '800', fontSize: 14 },
  pinCard: { alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.brand, backgroundColor: COLORS.brandSoft },
  pinLabel: { color: COLORS.brand, fontSize: 11.5, fontWeight: '900', letterSpacing: 0.8 },
  pin: { color: COLORS.ink, fontSize: 38, fontWeight: '900', letterSpacing: 10, marginTop: 4 },
  pinHelp: { color: COLORS.muted, fontSize: 12.5, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 },
  rowLabel: { color: COLORS.muted, fontSize: 14, flexShrink: 1 },
  rowValue: { color: COLORS.ink, fontSize: 14, fontWeight: '700', flexShrink: 0 },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.line, marginTop: 6, paddingTop: 10 },
  totalLabel: { color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  totalValue: { color: COLORS.ink, fontSize: 18, fontWeight: '900' },
  dueLabel: { color: COLORS.ink, fontSize: 15, fontWeight: '900', flexShrink: 1 },
  dueValue: { color: COLORS.brand, fontSize: 17, fontWeight: '900' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 12 },
  address: { flex: 1, color: COLORS.ink, fontSize: 13.5, lineHeight: 19 },
  secondary: { height: 48, paddingHorizontal: 22, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  secondaryText: { color: COLORS.ink, fontWeight: '800', fontSize: 15 },
  whatsapp: { height: 50, borderRadius: RADIUS.md, backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  whatsappText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
