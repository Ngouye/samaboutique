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
import { accentOf, fmt, onColor, swatchOf, thumbUrl } from '../../src/lib/format';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOW, sheet, FONTS } from '../../src/theme';
import { store } from '../../src/lib/storage';
import { GradientButton, gradientOf } from '../../src/components/ui';
import { addressIcon, defaultAddress, listAddresses, locateMe } from '../../src/lib/profile';
import { buzzLight } from '../../src/lib/feedback';

// Logos des opérateurs (mêmes images que le site) ; les autres ont une pastille de couleur.
const LOGOS = {
  wave: require('../../assets/logos/wave.png'),
  orange_money: require('../../assets/logos/orange-money.svg'),
};

// Coordonnées gardées sur le téléphone : pas besoin de les retaper d'une commande à l'autre.
// gps : position du téléphone jointe à l'adresse (le livreur reçoit l'itinéraire exact).
const EMPTY_FORM = { name: '', phone: '', address: '', zone: '', gps: null };

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
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput keyboardAppearance="dark" placeholderTextColor={COLORS.faint} style={[styles.input, input.multiline && styles.inputMulti, error && styles.inputError]} {...input} />
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
  // Coordonnées gardées ; sans adresse, l'adresse principale de « Mon espace » est proposée.
  const [form, setForm] = useState(() => {
    const saved = { ...EMPTY_FORM, ...store.get('client', {}) };
    const main = defaultAddress();
    return !saved.address && main ? { ...saved, address: main.address, gps: main.gps || null } : saved;
  });
  const [addresses] = useState(listAddresses);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [payment, setPayment] = useState('ON_DELIVERY');
  const [channel, setChannel] = useState(MOBILE_CHANNELS[0].id);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(null); // article dont on confirme le retrait

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
  useEffect(() => { store.set('client', { name: form.name, phone: form.phone, address: form.address, zone: form.zone, gps: form.gps || null }); }, [form]);

  const lines = cart.lines(shopName);
  const subtotal = cart.subtotal(shopName);
  const delivery = Number(zones.find((z) => z.name === form.zone)?.price) || 0;
  const total = subtotal + delivery;
  const useDeposit = payment === 'ON_DELIVERY' && depositOn;
  const deposit = depositFor(total);
  const accent = accentOf(merchant?.theme_color);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
    setMessage('');
  };

  // Adresse enregistrée choisie, ou position du téléphone.
  const pickAddress = (a) => {
    buzzLight();
    setForm((f) => ({ ...f, address: a.address, gps: a.gps || null }));
    if (errors.address) setErrors((e) => ({ ...e, address: null }));
  };
  const fillMyPosition = async () => {
    buzzLight();
    setLocateError('');
    setLocating(true);
    try {
      const found = await locateMe();
      setForm((f) => ({ ...f, gps: found.gps, address: f.address.trim() ? f.address : (found.text || 'Position GPS partagée') }));
      if (errors.address) setErrors((e) => ({ ...e, address: null }));
    } catch (e) {
      setLocateError(e?.message || 'Position introuvable. Vérifiez que la localisation est activée.');
    } finally {
      setLocating(false);
    }
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
          <Pressable onPress={() => router.replace({ pathname: '/boutique/[shop]', params: { shop: shopName } })} style={[styles.emptyButton, { backgroundColor: gradientOf(accent)[0] }]}>
            <Text style={[styles.emptyButtonText, { color: onColor(gradientOf(accent)[0]) }]}>Voir la boutique</Text>
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
        {/* Articles : une carte par article, retrait confirmé */}
        <Text style={styles.section}>Articles · {cart.count(shopName)}</Text>
        {lines.map((line) => {
          const parts = String(line.variant || '').split(' - ').filter(Boolean);
          return (
            <View key={line.key} style={styles.item}>
              <View style={styles.itemPhoto}>
                {line.product.image_url ? <Image source={thumbUrl(line.product.image_url)} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="image-outline" size={22} color={COLORS.faint} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemName} numberOfLines={2}>{line.product.name}</Text>
                  <Pressable onPress={() => setRemoving(removing === line.key ? null : line.key)} style={styles.trash} accessibilityLabel={`Retirer ${line.product.name}`} hitSlop={6}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.muted} />
                  </Pressable>
                </View>
                {parts.length ? (
                  <View style={styles.variants}>
                    {parts.map((v) => {
                      const hex = swatchOf(v);
                      return (
                        <View key={v} style={styles.variantChip}>
                          {hex === 'multi' ? <LinearGradient colors={['#f472b6', '#f6c768', '#2dd4bf', '#8a7cf1']} style={styles.variantDot} /> : hex ? <View style={[styles.variantDot, { backgroundColor: hex }]} /> : null}
                          <Text style={styles.variantText}>{hex || v.length > 4 ? v : `Taille ${v}`}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
                {removing === line.key ? (
                  <View style={styles.confirm}>
                    <Text style={styles.confirmText}>Retirer cet article ?</Text>
                    <Pressable onPress={() => setRemoving(null)} style={styles.confirmNo}><Text style={styles.confirmNoText}>Non</Text></Pressable>
                    <Pressable onPress={() => { changeQuantity(line, 0); setRemoving(null); }} style={styles.confirmYes}><Text style={styles.confirmYesText}>Oui</Text></Pressable>
                  </View>
                ) : (
                  <View style={styles.itemBottom}>
                    <Text style={styles.itemPrice}>{fmt(line.product.price_fcfa * line.quantity)}<Text style={styles.itemCurrency}> F</Text></Text>
                    <View style={styles.stepper}>
                      <Pressable onPress={() => (line.quantity === 1 ? setRemoving(line.key) : changeQuantity(line, line.quantity - 1))} style={styles.stepButton} accessibilityLabel="Un de moins" hitSlop={6}>
                        <Ionicons name="remove" size={16} color={COLORS.ink} />
                      </Pressable>
                      <Text style={styles.stepValue}>{line.quantity}</Text>
                      <Pressable onPress={() => changeQuantity(line, line.quantity + 1)} style={[styles.stepButton, styles.stepPlus]} accessibilityLabel="Un de plus" hitSlop={6}>
                        <Ionicons name="add" size={16} color={COLORS.ctaInk} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Coordonnées */}
        <Text style={styles.section}>Livraison</Text>
        <View style={styles.card}>
          <Field label="Nom complet" value={form.name} onChangeText={set('name')} placeholder="Ex. Fatou Diop" autoComplete="name" error={errors.name} />
          <Field label="Téléphone" value={form.phone} onChangeText={set('phone')} placeholder="77 123 45 67" keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
          <Text style={styles.fieldLabel}>Adresse de livraison</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} keyboardShouldPersistTaps="handled">
            <Pressable onPress={fillMyPosition} disabled={locating} style={[styles.quickChip, styles.quickGps, form.gps && styles.quickGpsOn]} accessibilityLabel="Utiliser ma position">
              {locating ? <ActivityIndicator size="small" color={COLORS.goldInk} /> : <Ionicons name={form.gps ? 'checkmark-circle' : 'navigate'} size={15} color={form.gps ? COLORS.green : COLORS.goldInk} />}
              <Text style={[styles.quickText, { color: form.gps ? COLORS.green : COLORS.goldInk }]}>{form.gps ? 'Position jointe' : 'Ma position'}</Text>
            </Pressable>
            {addresses.map((a) => {
              const on = form.address === a.address;
              return (
                <Pressable key={a.id} onPress={() => pickAddress(a)} style={[styles.quickChip, on && { borderColor: accent, backgroundColor: COLORS.brandSoft }]} accessibilityState={{ selected: on }}>
                  <Ionicons name={addressIcon(a.label)} size={14} color={on ? COLORS.ink : COLORS.muted} />
                  <Text style={[styles.quickText, on && { color: COLORS.ink }]}>{a.label}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => router.push('/compte')} style={styles.quickChip} accessibilityLabel="Gérer mes adresses">
              <Ionicons name="add" size={15} color={COLORS.muted} />
              <Text style={styles.quickText}>{addresses.length ? 'Gérer' : 'Enregistrer mes adresses'}</Text>
            </Pressable>
          </ScrollView>
          <Field label="" value={form.address} onChangeText={set('address')} placeholder="Quartier, rue, point de repère…" multiline error={errors.address} />
          {locateError ? <Text style={styles.fieldError}>{locateError}</Text> : null}
          {form.gps ? (
            <View style={styles.gpsNote}>
              <Ionicons name="navigate" size={13} color={COLORS.green} />
              <Text style={styles.gpsNoteText}>Position GPS jointe : le livreur aura l’itinéraire exact.</Text>
              <Pressable onPress={() => set('gps')(null)} hitSlop={8}><Text style={styles.gpsRemove}>Retirer</Text></Pressable>
            </View>
          ) : null}
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
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 999, padding: 3 },
  stepButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.raised, alignItems: 'center', justifyContent: 'center' },
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
  opLogo: { borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
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
  quick: { gap: 8, paddingBottom: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: COLORS.raised, borderWidth: 1, borderColor: COLORS.line,
  },
  quickGps: { backgroundColor: COLORS.goldSoft, borderColor: 'rgba(246,199,104,0.35)' },
  quickGpsOn: { backgroundColor: COLORS.greenSoft, borderColor: 'rgba(52,211,153,0.35)' },
  quickText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  gpsNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6, marginBottom: 12 },
  gpsNoteText: { flex: 1, color: COLORS.green, fontSize: 12, fontWeight: '600' },
  gpsRemove: { color: COLORS.danger, fontSize: 12.5, fontWeight: '800' },
  item: { flexDirection: 'row', gap: 12, padding: 10, marginBottom: 10, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, ...SHADOW },
  itemPhoto: { width: 82, height: 96, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.raised, alignItems: 'center', justifyContent: 'center' },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemName: { flex: 1, color: COLORS.ink, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  trash: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.raised, alignItems: 'center', justifyContent: 'center' },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  variantChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: COLORS.raised },
  variantDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  variantText: { color: COLORS.muted, fontSize: 11.5, fontWeight: '700' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 },
  itemPrice: { color: COLORS.ink, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  itemCurrency: { fontSize: 12, color: COLORS.goldInk },
  stepPlus: { backgroundColor: COLORS.cta },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 8 },
  confirmText: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  confirmNo: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.raised },
  confirmNoText: { color: COLORS.ink, fontSize: 13, fontWeight: '800' },
  confirmYes: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(248,113,113,0.18)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)' },
  confirmYesText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
});
