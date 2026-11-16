// Confirmation de commande : suit le paiement PayDunya (Wave, Orange Money…), puis affiche le code de livraison.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../../src/lib/cart';
import { cachedReceipt, fetchReceipt, isPaid, openPayment, paymentUrlOf, shopOfOrder } from '../../src/lib/order';
import { cachedMerchant } from '../../src/lib/shop';
import { saveOrder } from '../../src/lib/myOrders';
import { MOBILE_CHANNELS, depositAmount, isDeposit, whatsappNumber } from '../../src/lib/shared';
import { accentOf, fmt, onColor } from '../../src/lib/format';
import { COLORS, RADIUS, SHADOW, sheet } from '../../src/theme';
import SuccessBadge from '../../src/components/SuccessBadge';
import { GradientButton, gradientOf } from '../../src/components/ui';
import { buzzSuccess } from '../../src/lib/feedback';

const POLL_MS = 4000;
const POLL_LIMIT_MS = 10 * 60 * 1000; // au-delà, le client actualise lui-même

export default function OrderScreen() {
  const { id, shop: shopParam } = useLocalSearchParams();
  const orderId = String(id || '');
  const shopName = String(shopParam || '') || shopOfOrder(orderId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const merchant = cachedMerchant(shopName);
  const accent = accentOf(merchant?.theme_color);
  const accentText = onColor(accent);

  const [receipt, setReceipt] = useState(() => cachedReceipt(orderId));
  const [status, setStatus] = useState('loading'); // loading | ready | missing
  const [checking, setChecking] = useState(false);
  const startedAt = useRef(Date.now());
  const cleared = useRef(false);
  const paid = isPaid(receipt);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const data = await fetchReceipt(orderId);
      if (data) { setReceipt(data); setStatus('ready'); } else setStatus((s) => (s === 'ready' ? s : 'missing'));
    } catch {
      setStatus((s) => (s === 'loading' && cachedReceipt(orderId) ? 'ready' : s));
    } finally {
      setChecking(false);
    }
  }, [orderId]);

  // Vérification à l'ouverture, toutes les 4 secondes tant que le paiement n'est pas confirmé,
  // et dès que le client revient dans l'application après la page de paiement.
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (paid) return undefined;
    const timer = setInterval(() => { if (Date.now() - startedAt.current < POLL_LIMIT_MS) refresh(); }, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [paid, refresh]);

  // Paiement confirmé : le panier de cette boutique est vidé et la commande rangée dans « Mes commandes ».
  useEffect(() => {
    if (paid && !cleared.current && shopName) { cleared.current = true; cart.clear(shopName); buzzSuccess(); }
    if (paid && receipt) saveOrder(receipt, shopName);
  }, [paid, shopName, cart, receipt]);

  const reopenPayment = () => { const url = paymentUrlOf(orderId); if (url) openPayment(url).catch(() => {}); };
  const ref = orderId.split('-')[0].toUpperCase();
  const channel = MOBILE_CHANNELS.find((c) => c.id === receipt?.payment_channel);
  const total = Number(receipt?.total_amount_fcfa) || 0;
  const deposit = depositAmount(receipt);

  const confirmOnWhatsApp = () => {
    const phone = whatsappNumber(merchant?.phone_number);
    if (!phone || !receipt) return;
    const items = (receipt.cart_items || []).map((it) => `- ${it.quantity}x ${it.name} (${it.price} FCFA)`).join('\n');
    const money = isDeposit(receipt)
      ? `💰 Total : ${total} FCFA\n✅ Acompte payé : ${deposit} FCFA\n💵 Reste à payer à la livraison : ${total - deposit} FCFA`
      : receipt.payment_method === 'MOBILE_MONEY' ? `💰 Total payé en ligne : ${total} FCFA` : `💰 Total à payer à la livraison : ${total} FCFA`;
    const text = `👋 Bonjour ${shopName},\n\n🛒 Je viens de commander depuis l'application SamaBoutik (Réf : ${ref}).\n\n📦 Produits :\n${items}\n\n${money}\n\n📍 ${receipt.customer_name} · ${receipt.customer_phone}\n🏠 ${receipt.customer_address} (${receipt.delivery_zone})`;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
  };

  if (status === 'loading' && !receipt) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.centerText}>Vérification de votre commande…</Text>
      </View>
    );
  }

  if (status === 'missing' && !receipt) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="help-circle-outline" size={48} color={COLORS.faint} />
        <Text style={styles.centerTitle}>Commande introuvable</Text>
        <Text style={styles.centerText}>Si vous avez payé, la boutique vous contactera. Vous pouvez aussi lui écrire sur WhatsApp.</Text>
        <Pressable onPress={() => router.replace('/')} style={styles.secondary}><Text style={styles.secondaryText}>Retour à l’accueil</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 18, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 30 }}>
      {paid ? (
        <View style={styles.hero}>
          <SuccessBadge colors={gradientOf(accent)} />
          <Text style={styles.heroTitle}>Commande confirmée !</Text>
          <Text style={styles.heroText}>
            {isDeposit(receipt) ? 'Votre acompte est bien reçu. La boutique prépare votre commande.'
              : receipt.payment_method === 'MOBILE_MONEY' ? 'Votre paiement est bien reçu. La boutique prépare votre commande.'
                : 'La boutique a reçu votre commande. Vous paierez à la livraison.'}
          </Text>
        </View>
      ) : (
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: COLORS.goldSoft }]}><ActivityIndicator color={COLORS.goldInk} /></View>
          <Text style={styles.heroTitle}>Paiement en attente</Text>
          <Text style={styles.heroText}>
            Terminez le paiement {isDeposit(receipt) ? 'de l’acompte ' : ''}sur la page {channel?.label || 'de paiement'} (PayDunya). Cette page se met à jour toute seule dès que le paiement est confirmé.
          </Text>
          <View style={styles.actionsRow}>
            {paymentUrlOf(orderId) ? (
              <Pressable onPress={reopenPayment} style={[styles.primary, { backgroundColor: accent }]}>
                <Ionicons name="open-outline" size={18} color={accentText} />
                <Text style={[styles.primaryText, { color: accentText }]}>Rouvrir la page de paiement</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={refresh} disabled={checking} style={styles.secondary}>
              {checking ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.secondaryText}>J’ai payé, vérifier</Text>}
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Numéro de commande</Text>
        <Text style={styles.ref}>{ref}</Text>
        {paid && receipt.delivery_pin ? (
          <View style={[styles.pinBox, { borderColor: accent }]}>
            <Text style={styles.pinLabel}><Ionicons name="lock-closed" size={12} /> CODE SECRET DE LIVRAISON</Text>
            <Text style={styles.pin}>{receipt.delivery_pin}</Text>
            <Text style={styles.pinHelp}>Donnez ce code au livreur seulement quand vous avez reçu votre colis.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        {(receipt.cart_items || []).map((it, i) => (
          <View key={`${it.product_id}-${i}`} style={styles.row}>
            <Text style={styles.rowLabel} numberOfLines={2}>{it.quantity} × {it.name}</Text>
            <Text style={styles.rowValue}>{fmt(it.price * it.quantity)} F</Text>
          </View>
        ))}
        <View style={styles.row}><Text style={styles.rowLabel}>Livraison · {receipt.delivery_zone}</Text><Text style={styles.rowValue}>{fmt(total - (receipt.cart_items || []).reduce((n, it) => n + it.price * it.quantity, 0))} F</Text></View>
        <View style={[styles.row, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{fmt(total)} F</Text></View>
        {isDeposit(receipt) ? (
          <>
            <View style={styles.row}><Text style={styles.rowLabel}>{paid ? 'Acompte payé' : 'Acompte à payer'}{channel ? ` (${channel.label})` : ''}</Text><Text style={styles.rowValue}>− {fmt(deposit)} F</Text></View>
            <View style={[styles.row, styles.dueRow]}><Text style={styles.dueLabel}>À payer au livreur</Text><Text style={[styles.dueValue, { color: COLORS.brand }]}>{fmt(total - deposit)} F</Text></View>
          </>
        ) : receipt.payment_method === 'MOBILE_MONEY' ? (
          <View style={styles.row}><Text style={styles.rowLabel}>{paid ? 'Payé en ligne' : 'À payer en ligne'}{channel ? ` (${channel.label})` : ''}</Text><Text style={styles.rowValue}>{fmt(total)} F</Text></View>
        ) : (
          <View style={[styles.row, styles.dueRow]}><Text style={styles.dueLabel}>À payer à la livraison</Text><Text style={[styles.dueValue, { color: COLORS.brand }]}>{fmt(total)} F</Text></View>
        )}
      </View>

      {paid ? (
        <View style={{ gap: 10, marginTop: 6 }}>
          {whatsappNumber(merchant?.phone_number) ? (
            <Pressable onPress={confirmOnWhatsApp} style={styles.whatsapp}>
              <Ionicons name="logo-whatsapp" size={19} color="#fff" />
              <Text style={styles.whatsappText}>Prévenir la boutique sur WhatsApp</Text>
            </Pressable>
          ) : null}
          <GradientButton onPress={() => router.replace({ pathname: '/suivi/[id]', params: { id: orderId } })} colors={gradientOf(accent)} icon="navigate" title="Suivre ma commande" />
          <Pressable onPress={() => router.replace({ pathname: '/boutique/[shop]', params: { shop: shopName } })} style={styles.secondary}>
            <Text style={styles.secondaryText}>Retour à la boutique</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => router.replace({ pathname: '/panier/[shop]', params: { shop: shopName } })} style={[styles.secondary, { marginTop: 6 }]}>
          <Text style={styles.secondaryText}>Modifier ma commande</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.bg },
  centerTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900', marginTop: 12 },
  centerText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  hero: { alignItems: 'center', marginBottom: 18 },
  heroIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: COLORS.ink, fontSize: 24, fontWeight: '900', marginTop: 14, letterSpacing: -0.4 },
  heroText: { color: COLORS.muted, fontSize: 14.5, textAlign: 'center', lineHeight: 21, marginTop: 6, paddingHorizontal: 6 },
  actionsRow: { alignSelf: 'stretch', gap: 10, marginTop: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOW, shadowOpacity: 0.05 },
  label: { color: COLORS.muted, fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  ref: { color: COLORS.ink, fontSize: 22, fontWeight: '900', letterSpacing: 3, textAlign: 'center', marginTop: 2, fontFamily: 'monospace' },
  pinBox: { marginTop: 14, borderWidth: 2, borderStyle: 'dashed', borderRadius: RADIUS.md, padding: 14, alignItems: 'center', backgroundColor: COLORS.bg },
  pinLabel: { color: COLORS.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8 },
  pin: { color: COLORS.ink, fontSize: 38, fontWeight: '900', letterSpacing: 10, marginTop: 4 },
  pinHelp: { color: COLORS.muted, fontSize: 12.5, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 },
  rowLabel: { color: COLORS.muted, fontSize: 14, flexShrink: 1 },
  rowValue: { color: COLORS.ink, fontSize: 14, fontWeight: '700', flexShrink: 0 },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.line, marginTop: 6, paddingTop: 10 },
  totalLabel: { color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  totalValue: { color: COLORS.ink, fontSize: 18, fontWeight: '900' },
  dueRow: { marginTop: 4 },
  dueLabel: { color: COLORS.ink, fontSize: 15, fontWeight: '900' },
  dueValue: { fontSize: 18, fontWeight: '900' },
  primary: { height: 50, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontWeight: '900', fontSize: 15 },
  secondary: { height: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  secondaryText: { color: COLORS.ink, fontWeight: '800', fontSize: 15 },
  whatsapp: { height: 50, borderRadius: RADIUS.md, backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  whatsappText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
