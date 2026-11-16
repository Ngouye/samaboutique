// Panier et commande d'une boutique : articles, coordonnées, zone de livraison, paiement.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../../src/lib/cart';
import { cachedMerchant, fetchShop, rememberShop, zonesOf } from '../../src/lib/shop';
import { createOrder, depositAvailable, openPayment } from '../../src/lib/order';
import { DEPOSIT_PERCENT, MOBILE_CHANNELS, depositFor, isMobileChannel } from '../../src/lib/shared';
import { accentOf, fmt, onColor, thumbUrl } from '../../src/lib/format';
import { COLORS, RADIUS, SHADOW, sheet, FONTS } from '../../src/theme';
import { store } from '../../src/lib/storage';
import { GradientButton, gradientOf } from '../../src/components/ui';

// Logos des opérateurs (mêmes images que le site) ; les autres ont une pastille de couleur.
const LOGOS = {
  wave: require('../../assets/logos/wave.png'),
  orange_money: require('../../assets/logos/orange-money.svg'),
};

// Coordonnées gardées sur le téléphone : pas besoin de les retaper d'une commande à l'autre.
const EMPTY_FORM = { name: '', phone: '', address: '', zone: '' };

function OperatorBadge({ channel, size = 30 }) {
  const logo = LOGOS[channel.id];
  return logo ? (
    <View style={[styles.opLogo, { width: size, height: size }]}><Image source={logo} style={{ width: size - 6, height: size - 6 }} contentFit="contain" /></View>
  ) : (
    <View style={[styles.opLogo, { width: size, height: size, backgroundColor: channel.tint }]}>
      <Text style={{ color: channel.ink, fontSize: size * 0.34, fontFamily: FONTS.extrabold }}>{channel.monogram}</Text>
    </View>
  );
}

function Field({ label, error, ...input }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={COLORS.faint} style={[styles.input, input.multiline && styles.inputMulti, error && styles.inputError]} {...input} />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function CartScreen() {
  const { shop: shopParam } = useLocalSearchParams();
  const shopName = String(shopParam || '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCart();

  const [merchant, setMerchant] = useState(() => cachedMerchant(shopName));
  const [depositOn, setDepositOn] = useState(true);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...store.get('client', {}) }));
  const [payment, setPayment] = useState('ON_DELIVERY');
  const [channel, setChannel] = useState(MOBILE_CHANNELS[0].id);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!merchant) {
      fetchShop(shopName).then((data) => {
        if (!alive || !data) return;
        rememberShop(data.merchant, data.products);
        setMerchant(data.merchant);
      }).catch(() => {});
    }
    depositAvailable().then((ok) => alive && setDepositOn(ok));
    return () => { alive = false; };
  }, [merchant, shopName]);

  const zones = useMemo(() => zonesOf(merchant), [merchant]);
  useEffect(() => {
    if (zones.length && !zones.some((z) => z.name === form.zone)) setForm((f) => ({ ...f, zone: zones[0].name }));
  }, [zones, form.zone]);
  useEffect(() => { store.set('client', { name: form.name, phone: form.phone, address: form.address, zone: form.zone }); }, [form]);

  const lines = cart.lines(shopName);
  const subtotal = cart.subtotal(shopName);
  const delivery = Number(zones.find((z) => z.name === form.zone)?.price) || 0;
  const total = subtotal + delivery;
  const useDeposit = payment === 'ON_DELIVERY' && depositOn;
  const deposit = depositFor(total);
  const accent = accentOf(merchant?.theme_color);
  const accentText = onColor(accent);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
    setMessage('');
  };

  const changeQuantity = (line, quantity) => {
    const result = cart.setQuantity(shopName, line.key, quantity);
    setMessage(result.ok ? '' : result.message || '');
  };

  const goBack = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);

  const submit = async () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Indiquez votre nom.';
    if (form.phone.replace(/\D/g, '').length < 7) next.phone = 'Indiquez un numéro de téléphone valide.';
    if (form.address.trim().length < 2) next.address = 'Indiquez votre adresse de livraison.';
    if (!form.zone) next.zone = 'Choisissez une zone de livraison.';
    setErrors(next);
    if (Object.keys(next).length) { setMessage('Complétez vos coordonnées pour commander.'); return; }
    if (!merchant || !lines.length) return;

    setSubmitting(true);
    setMessage('');
    try {
      const order = await createOrder({ merchant, lines, form, payment, channel });
      if (order.kind === 'payment') openPayment(order.paymentUrl).catch(() => {});
      else cart.clear(shopName); // commande à la livraison enregistrée : rien à payer en ligne
      router.replace({ pathname: '/commande/[id]', params: { id: String(order.orderId), shop: shopName } });
    } catch (e) {
      setMessage(e?.message || 'La commande n’a pas pu être envoyée. Réessayez dans un instant.');
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={goBack} style={styles.round} accessibilityLabel="Retour" hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Ma commande</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{shopName}</Text>
      </View>
    </View>
  );

  // Étapes de la commande : articles, livraison (coordonnées remplies), paiement.
  const contactDone = form.name.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 7 && form.address.trim().length >= 2 && Boolean(form.zone);
  const steps = [
    { label: 'Articles', icon: 'bag-handle', done: true },
    { label: 'Livraison', icon: 'location', done: contactDone },
    { label: 'Paiement', icon: 'card', done: false },
  ];
  const stepper = (
    <View style={styles.steps}>
      {steps.map((st, i) => {
        const active = st.done || (i > 0 && steps[i - 1].done);
        return (
          <View key={st.label} style={styles.step}>
            <View style={[styles.stepDot, active && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }]}>
              <Ionicons name={st.done ? 'checkmark' : st.icon} size={14} color={active ? '#fff' : COLORS.faint} />
            </View>
            <Text style={[styles.stepLabel, active && { color: COLORS.ink }]}>{st.label}</Text>
            {i < steps.length - 1 ? <View style={[styles.stepLine, st.done && { backgroundColor: COLORS.brand }]} /> : null}
          </View>
        );
      })}
    </View>
  );

  if (!lines.length) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={48} color={COLORS.faint} />
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptyText}>Ajoutez des articles depuis la boutique pour commander.</Text>
          <Pressable onPress={() => router.replace({ pathname: '/boutique/[shop]', params: { shop: shopName } })} style={[styles.emptyButton, { backgroundColor: accent }]}>
            <Text style={[styles.emptyButtonText, { color: accentText }]}>Voir la boutique</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const buttonLabel = useDeposit ? "Payer l'acompte" : isMobileChannel(payment) ? 'Payer' : 'Commander';
  const buttonAmount = useDeposit ? deposit : total;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {stepper}
        {/* Articles */}
        <Text style={styles.section}>Articles</Text>
        <View style={styles.card}>
          {lines.map((line, i) => (
            <View key={line.key} style={[styles.line, i > 0 && styles.lineBorder]}>
              <View style={styles.thumb}>
                {line.product.image_url ? <Image source={thumbUrl(line.product.image_url)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="image-outline" size={20} color={COLORS.faint} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineName} numberOfLines={2}>{line.product.name}</Text>
                {line.variant ? <Text style={styles.lineVariant}>{line.variant}</Text> : null}
                <Text style={styles.linePrice}>{fmt(line.product.price_fcfa * line.quantity)} F</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => changeQuantity(line, line.quantity - 1)} style={styles.stepButton} accessibilityLabel={line.quantity === 1 ? 'Retirer' : 'Un de moins'} hitSlop={6}>
                  <Ionicons name={line.quantity === 1 ? 'trash-outline' : 'remove'} size={17} color={COLORS.ink} />
                </Pressable>
                <Text style={styles.stepValue}>{line.quantity}</Text>
                <Pressable onPress={() => changeQuantity(line, line.quantity + 1)} style={styles.stepButton} accessibilityLabel="Un de plus" hitSlop={6}>
                  <Ionicons name="add" size={17} color={COLORS.ink} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Coordonnées */}
        <Text style={styles.section}>Livraison</Text>
        <View style={styles.card}>
          <Field label="Nom complet" value={form.name} onChangeText={set('name')} placeholder="Ex. Fatou Diop" autoComplete="name" error={errors.name} />
          <Field label="Téléphone" value={form.phone} onChangeText={set('phone')} placeholder="77 123 45 67" keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
          <Field label="Adresse de livraison" value={form.address} onChangeText={set('address')} placeholder="Quartier, rue, point de repère…" multiline error={errors.address} />
          <Text style={styles.fieldLabel}>Zone de livraison</Text>
          <View style={styles.zones}>
            {zones.map((z) => {
              const on = form.zone === z.name;
              return (
                <Pressable key={z.name} onPress={() => set('zone')(z.name)} style={[styles.zone, on && { borderColor: accent, backgroundColor: COLORS.brandSoft }]} accessibilityState={{ selected: on }}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? accent : COLORS.faint} />
                  <Text style={styles.zoneName}>{z.name}</Text>
                  <Text style={styles.zonePrice}>{fmt(z.price)} F</Text>
                </Pressable>
              );
            })}
          </View>
          {errors.zone ? <Text style={styles.fieldError}>{errors.zone}</Text> : null}
          <Text style={styles.privacy}><Ionicons name="phone-portrait-outline" size={12} color={COLORS.faint} /> Vos coordonnées restent sur ce téléphone pour vos prochaines commandes.</Text>
        </View>

        {/* Paiement */}
        <Text style={styles.section}>Paiement</Text>
        <View style={styles.card}>
          <Pressable onPress={() => setPayment('ON_DELIVERY')} style={[styles.payOption, payment === 'ON_DELIVERY' && { borderColor: accent, backgroundColor: COLORS.brandSoft }]}>
            <View style={[styles.opLogo, { width: 34, height: 34, backgroundColor: COLORS.bg }]}><Ionicons name="bicycle" size={20} color={COLORS.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>À la livraison</Text>
              <Text style={styles.paySub}>{depositOn ? `Acompte de ${DEPOSIT_PERCENT} % en ligne, le reste au livreur` : 'Espèces au livreur'}</Text>
            </View>
            <Ionicons name={payment === 'ON_DELIVERY' ? 'radio-button-on' : 'radio-button-off'} size={20} color={payment === 'ON_DELIVERY' ? accent : COLORS.faint} />
          </Pressable>
          <View style={styles.payGrid}>
            {MOBILE_CHANNELS.map((c) => {
              const on = payment === c.id;
              return (
                <Pressable key={c.id} onPress={() => setPayment(c.id)} style={[styles.payTile, on && { borderColor: accent, backgroundColor: COLORS.brandSoft }]}>
                  <OperatorBadge channel={c} />
                  <Text style={styles.payTileText} numberOfLines={1}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {useDeposit ? (
            <View style={styles.depositBox}>
              <Text style={styles.depositIntro}><Text style={{ fontFamily: FONTS.extrabold, color: COLORS.ink }}>Acompte de {DEPOSIT_PERCENT} % pour confirmer la commande.</Text> Vous payez le reste au livreur, à la réception du colis.</Text>
              <View style={styles.depositSplit}>
                <View style={[styles.depositCell, { backgroundColor: COLORS.brandSoft }]}>
                  <Text style={styles.depositCellLabel}>MAINTENANT</Text>
                  <Text style={[styles.depositCellValue, { color: COLORS.brand }]}>{fmt(deposit)} F</Text>
                </View>
                <View style={[styles.depositCell, { backgroundColor: COLORS.bg }]}>
                  <Text style={styles.depositCellLabel}>AU LIVREUR</Text>
                  <Text style={styles.depositCellValue}>{fmt(total - deposit)} F</Text>
                </View>
              </View>
              <Text style={styles.fieldLabel}>Payer l’acompte avec</Text>
              <View style={styles.payGrid}>
                {MOBILE_CHANNELS.map((c) => {
                  const on = channel === c.id;
                  return (
                    <Pressable key={c.id} onPress={() => setChannel(c.id)} style={[styles.payTile, on && { borderColor: accent, backgroundColor: COLORS.brandSoft }]}>
                      <OperatorBadge channel={c} size={26} />
                      <Text style={styles.payTileText} numberOfLines={1}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          {(useDeposit || isMobileChannel(payment)) ? (
            <Text style={styles.payNote}>
              <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.muted} /> Vous allez payer sur la page sécurisée {MOBILE_CHANNELS.find((c) => c.id === (useDeposit ? channel : payment))?.label} (PayDunya), puis revenir dans l’application.
            </Text>
          ) : null}
        </View>

        {/* Récapitulatif */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.sumRow}><Text style={styles.sumLabel}>Articles</Text><Text style={styles.sumValue}>{fmt(subtotal)} F</Text></View>
          <View style={styles.sumRow}><Text style={styles.sumLabel} numberOfLines={1}>Livraison · {form.zone}</Text><Text style={styles.sumValue}>{fmt(delivery)} F</Text></View>
          <View style={[styles.sumRow, styles.sumTotal]}><Text style={styles.sumTotalLabel}>Total</Text><Text style={styles.sumTotalValue}>{fmt(total)} F</Text></View>
          {useDeposit ? (
            <View style={styles.sumRow}><Text style={styles.sumLabel}>Reste à payer au livreur</Text><Text style={styles.sumValue}>{fmt(total - deposit)} F</Text></View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <GradientButton
          onPress={submit}
          disabled={!merchant}
          loading={submitting}
          colors={gradientOf(accent)}
          icon="lock-closed"
          title={submitting ? 'Envoi…' : buttonLabel}
          right={`${fmt(buttonAmount)} F`}
        />
        <Text style={styles.secure}><Ionicons name="shield-checkmark" size={11} color={COLORS.green} /> Paiement sécurisé par PayDunya</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: COLORS.bg },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  steps: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 10, marginBottom: 6, ...SHADOW, shadowOpacity: 0.05 },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stepLabel: { color: COLORS.faint, fontSize: 12, fontWeight: '700' },
  stepLine: { position: 'absolute', top: 14, left: '62%', width: '76%', height: 2, backgroundColor: COLORS.line },
  secure: { color: COLORS.muted, fontSize: 11.5, textAlign: 'center', marginTop: 8 },
  section: { color: COLORS.ink, fontSize: 16.5, fontWeight: '900', marginTop: 8, marginBottom: 10 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 8, ...SHADOW, shadowOpacity: 0.05 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  lineBorder: { borderTopWidth: 1, borderTopColor: COLORS.line },
  thumb: { width: 58, height: 58, borderRadius: 12, overflow: 'hidden', backgroundColor: '#efece6', alignItems: 'center', justifyContent: 'center' },
  lineName: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  lineVariant: { color: COLORS.muted, fontSize: 12.5, marginTop: 1 },
  linePrice: { color: COLORS.ink, fontSize: 14.5, fontWeight: '900', marginTop: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 999, padding: 3 },
  stepButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 26, textAlign: 'center', color: COLORS.ink, fontWeight: '900', fontSize: 15 },
  field: { marginBottom: 12 },
  fieldLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.line, borderRadius: RADIUS.sm + 2, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: COLORS.ink, backgroundColor: COLORS.bg },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  inputError: { borderColor: COLORS.danger },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  zones: { gap: 8 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: RADIUS.sm + 2, paddingHorizontal: 12, paddingVertical: 11 },
  zoneName: { flex: 1, color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  zonePrice: { color: COLORS.brand, fontSize: 14, fontWeight: '900' },
  privacy: { color: COLORS.faint, fontSize: 12, marginTop: 10 },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: RADIUS.md, padding: 12 },
  payTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  paySub: { color: COLORS.muted, fontSize: 12.5, marginTop: 1 },
  payGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  payTile: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: RADIUS.md, padding: 9 },
  payTileText: { flex: 1, color: COLORS.ink, fontSize: 13.5, fontWeight: '800' },
  opLogo: { borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' },
  depositBox: { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14 },
  depositIntro: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  depositSplit: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  depositCell: { flex: 1, borderRadius: RADIUS.sm + 2, padding: 10 },
  depositCellLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  depositCellValue: { color: COLORS.ink, fontSize: 18, fontWeight: '900', marginTop: 2 },
  payNote: { color: COLORS.muted, fontSize: 12.5, lineHeight: 18, marginTop: 12 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  sumLabel: { color: COLORS.muted, fontSize: 14, flexShrink: 1 },
  sumValue: { color: COLORS.ink, fontSize: 14, fontWeight: '700', flexShrink: 0 },
  sumTotal: { borderTopWidth: 1, borderTopColor: COLORS.line, marginTop: 6, paddingTop: 10 },
  sumTotalLabel: { color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  sumTotalValue: { color: COLORS.ink, fontSize: 18, fontWeight: '900' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.card, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
  message: { color: COLORS.danger, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  submit: { height: 54, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10 },
  submitText: { flex: 1, fontSize: 16, fontWeight: '900' },
  submitAmount: { fontSize: 17, fontWeight: '900' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900', marginTop: 12 },
  emptyText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6 },
  emptyButton: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.md },
  emptyButtonText: { fontWeight: '900', fontSize: 15 },
});
