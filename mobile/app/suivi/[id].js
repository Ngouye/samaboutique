// Suivi d'une commande : alerte (livreur qui cherche à joindre le client, changement de livreur), étapes,
// livreur en route (téléphone et position), code de livraison, historique, montants.
// Une fois livrée : avis sur chaque produit (badge « Achat vérifié »). Toujours : commander à nouveau, partager le reçu.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TRACK_STEPS, clockLabel, findOrder, receiptText, sinceLabel, statusInfo, trackHistory, trackOrder } from '../../src/lib/myOrders';
import { cachedMerchant, fetchProductsByIds, fetchShop, isSoldOut, rememberShop, variantFromItem } from '../../src/lib/shop';
import { productsOfOrder, reviewedIn } from '../../src/lib/reviews';
import { useCart } from '../../src/lib/cart';
import ReviewSheet from '../../src/components/ReviewSheet';
import { GradientButton } from '../../src/components/ui';
import { MOBILE_CHANNELS, customerTimeline, depositAmount, isDeposit, trackingNotice, whatsappNumber } from '../../src/lib/shared';
import { buzzSuccess, buzzWarning } from '../../src/lib/feedback';
import { fmt } from '../../src/lib/format';
import { COLORS, RADIUS, SHADOW, sheet } from '../../src/theme';

const REFRESH_MS = 15000; // actualisation tant que la commande n'est pas terminée
const TONES = {
  brand: { bg: COLORS.brandSoft, fg: COLORS.brand },
  gold: { bg: COLORS.goldSoft, fg: COLORS.goldInk },
  green: { bg: COLORS.greenSoft, fg: COLORS.green },
  red: { bg: 'rgba(248,113,113,0.14)', fg: COLORS.danger },
};

// Icône et couleur de chaque étape de l'historique
const STEP_STYLE = {
  created: ['receipt-outline', 'brand'],
  deposit_paid: ['card-outline', 'green'],
  paid: ['card-outline', 'green'],
  accepted: ['storefront-outline', 'brand'],
  preparing_again: ['cube-outline', 'brand'],
  driver_taken: ['bicycle-outline', 'brand'],
  in_transit: ['bicycle-outline', 'brand'],
  driver_calling: ['call-outline', 'red'],
  driver_lost: ['location-outline', 'gold'],
  driver_changed: ['swap-horizontal-outline', 'gold'],
  delivered: ['checkmark-done-outline', 'green'],
  cancelled: ['close-circle-outline', 'red'],
  disputed: ['alert-circle-outline', 'gold'],
};
const NOTICE_ICON = { driver_calling: 'call', driver_lost: 'navigate', driver_changed: 'swap-horizontal' };

export default function TrackScreen() {
  const { id } = useLocalSearchParams();
  const orderId = String(id || '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entry = findOrder(orderId);

  const [order, setOrder] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [merchant, setMerchant] = useState(() => (entry ? cachedMerchant(entry.shop) : null));
  const [now, setNow] = useState(Date.now());
  const cart = useCart();
  const [reviewing, setReviewing] = useState(null); // produit en cours de notation
  const [reviewed, setReviewed] = useState(() => new Set(reviewedIn(orderId)));
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    if (!entry) return;
    const [result, history] = await Promise.all([trackOrder(entry), trackHistory(entry)]);
    setNow(Date.now());
    if (history) setEvents(history);
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

  // Vibration quand une nouvelle alerte apparaît (le livreur cherche à joindre le client, changement de livreur).
  const notice = order ? trackingNotice(order, events, now) : null;
  const noticeKey = notice ? `${notice.kind}-${notice.at}` : '';
  const lastNotice = useRef('');
  useEffect(() => {
    if (noticeKey && lastNotice.current !== noticeKey) buzzWarning();
    lastNotice.current = noticeKey;
  }, [noticeKey]);

  const refresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  // Commander à nouveau : les mêmes articles (encore en vente) reviennent dans le panier de la boutique.
  const reorder = async () => {
    if (!order || reordering) return;
    setReordering(true);
    try {
      const items = order.cart_items || [];
      const products = await fetchProductsByIds(items.map((it) => it.product_id));
      const byId = new Map(products.map((p) => [String(p.id), p]));
      let added = 0;
      const missing = [];
      items.forEach((it) => {
        const product = byId.get(String(it.product_id));
        if (!product || isSoldOut(product)) { missing.push(it.name); return; }
        const variant = variantFromItem(it, product);
        for (let k = 0; k < (Number(it.quantity) || 1); k += 1) {
          const result = cart.add(entry.shop, product, variant, merchant);
          if (!result.ok) { if (k === 0) missing.push(it.name); break; }
          added += 1;
        }
      });
      if (!added) {
        Alert.alert('Articles indisponibles', 'Les articles de cette commande ne sont plus en vente pour le moment.');
        return;
      }
      buzzSuccess();
      router.push({ pathname: '/panier/[shop]', params: { shop: entry.shop } });
      if (missing.length) Alert.alert('Panier prêt', `Ces articles ne sont plus disponibles et n’ont pas été ajoutés : ${missing.join(', ')}.`);
    } catch {
      Alert.alert('Pas de connexion', 'Impossible de vérifier les articles. Réessayez dans un instant.');
    } finally {
      setReordering(false);
    }
  };
  const shareReceipt = () => { if (order) Share.share({ message: receiptText(order, entry.shop) }).catch(() => {}); };
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
  const timeline = customerTimeline(events).reverse(); // le plus récent en haut
  const noticeTone = notice ? TONES[notice.tone] : null;
  const callNumber = driverPhone || shopPhone;

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor={COLORS.brand} />}
      >
        {/* Alerte : le livreur cherche à joindre le client, ne trouve pas l'adresse, ou a changé */}
        {notice ? (
          <View style={[styles.notice, { backgroundColor: noticeTone.bg, borderColor: noticeTone.fg }]} accessibilityRole="alert">
            <View style={styles.noticeHead}>
              <View style={[styles.noticeIcon, { backgroundColor: noticeTone.fg }]}><Ionicons name={NOTICE_ICON[notice.kind] || 'alert'} size={20} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: noticeTone.fg }]}>{notice.title}</Text>
                <Text style={styles.noticeText}>{notice.text}</Text>
                {notice.at ? <Text style={styles.noticeTime}>{sinceLabel(notice.at, now)}</Text> : null}
              </View>
            </View>
            {notice.call && callNumber ? (
              <Pressable onPress={() => Linking.openURL(`tel:+${callNumber}`)} style={[styles.noticeButton, { backgroundColor: noticeTone.fg }]}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={styles.noticeButtonText}>{driverPhone ? `Appeler ${order.driver_name || 'le livreur'}` : 'Appeler la boutique'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

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

        {/* Avis sur les produits reçus */}
        {order.status === 'DELIVERED' && productsOfOrder(order).length ? (
          <View style={[styles.card, styles.reviewCard]}>
            <View style={styles.reviewHead}>
              <Ionicons name="star" size={18} color={COLORS.gold} />
              <Text style={styles.cardTitleInline}>Votre avis compte</Text>
            </View>
            <Text style={styles.reviewIntro}>Notez les produits reçus : votre avis portera le badge « Achat vérifié ».</Text>
            {productsOfOrder(order).map((p) => {
              const done = reviewed.has(p.id);
              return (
                <View key={p.id} style={styles.reviewRow}>
                  <Text style={styles.reviewName} numberOfLines={2}>{p.name}</Text>
                  {done ? (
                    <View style={styles.reviewDone}><Ionicons name="checkmark-circle" size={15} color={COLORS.green} /><Text style={styles.reviewDoneText}>Merci !</Text></View>
                  ) : (
                    <Pressable onPress={() => setReviewing(p)} style={styles.reviewButton} accessibilityLabel={`Noter ${p.name}`}>
                      <Ionicons name="star-outline" size={14} color={COLORS.ctaInk} /><Text style={styles.reviewButtonText}>Noter</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

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

        {/* Historique */}
        {timeline.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Historique</Text>
            {timeline.map((s, i) => {
              const [icon, toneName] = STEP_STYLE[s.kind] || ['ellipse-outline', 'brand'];
              const stepTone = TONES[toneName];
              const last = i === timeline.length - 1;
              return (
                <View key={s.key} style={styles.event}>
                  <View style={styles.eventRail}>
                    <View style={[styles.eventDot, { backgroundColor: i === 0 ? stepTone.fg : stepTone.bg }]}>
                      <Ionicons name={icon} size={14} color={i === 0 ? '#fff' : stepTone.fg} />
                    </View>
                    {!last ? <View style={styles.eventLine} /> : null}
                  </View>
                  <View style={[styles.eventBody, !last && { paddingBottom: 14 }]}>
                    <Text style={[styles.eventLabel, i === 0 && { fontWeight: '900' }]}>{s.label}</Text>
                    {s.at ? <Text style={styles.eventTime}>{clockLabel(s.at, now)}</Text> : null}
                  </View>
                </View>
              );
            })}
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

        <GradientButton title="Commander à nouveau" icon="repeat" onPress={reorder} loading={reordering} style={{ marginBottom: 10 }} />
        <Pressable onPress={shareReceipt} style={[styles.secondary, styles.shareButton]} accessibilityLabel="Partager le reçu">
          <Ionicons name="share-social-outline" size={18} color={COLORS.ink} />
          <Text style={styles.secondaryText}>Partager le reçu</Text>
        </Pressable>

        {shopPhone ? (
          <Pressable onPress={() => Linking.openURL(`https://wa.me/${shopPhone}?text=${encodeURIComponent(`Bonjour ${entry.shop}, je vous écris au sujet de ma commande n° ${orderId.split('-')[0].toUpperCase()}.`)}`)} style={styles.whatsapp}>
            <Ionicons name="logo-whatsapp" size={19} color="#fff" />
            <Text style={styles.whatsappText}>Écrire à la boutique</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <ReviewSheet
        product={reviewing}
        orderId={orderId}
        onClose={() => setReviewing(null)}
        onDone={(productId) => setReviewed((prev) => new Set([...prev, String(productId)]))}
      />
    </View>
  );
}

const styles = sheet({
  reviewCard: { borderColor: 'rgba(246,199,104,0.3)' },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitleInline: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  reviewIntro: { color: COLORS.muted, fontSize: 13, marginTop: 4, marginBottom: 6, lineHeight: 18 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
  reviewName: { flex: 1, color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  reviewButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.cta, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  reviewButtonText: { color: COLORS.ctaInk, fontSize: 13, fontWeight: '800' },
  reviewDone: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewDoneText: { color: COLORS.green, fontSize: 13, fontWeight: '800' },
  shareButton: { flexDirection: 'row', gap: 8, marginBottom: 10 },
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
  notice: { borderRadius: RADIUS.lg, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  noticeHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noticeIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontSize: 16, fontWeight: '900' },
  noticeText: { color: COLORS.ink, fontSize: 13.5, lineHeight: 19, marginTop: 2 },
  noticeTime: { color: COLORS.muted, fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  noticeButton: { height: 48, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  noticeButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  event: { flexDirection: 'row', gap: 12 },
  eventRail: { alignItems: 'center', width: 28 },
  eventDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventLine: { flex: 1, width: 2, backgroundColor: COLORS.line, marginVertical: 3 },
  eventBody: { flex: 1, paddingTop: 4 },
  eventLabel: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  eventTime: { color: COLORS.faint, fontSize: 12, fontWeight: '600', marginTop: 1 },
});
