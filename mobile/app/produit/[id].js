// Fiche produit : photos, prix, stock, tailles et couleurs, caractéristiques, description, avis, ajout au panier.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Pressable, ScrollView, Share, Text, View, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cachedProduct, fetchProduct, galleryOf, isLowStock, isSoldOut } from '../../src/lib/shop';
import { productOptions } from '../../src/lib/shared';
import { useCart, variantLabel } from '../../src/lib/cart';
import { buzzSuccess, buzzWarning } from '../../src/lib/feedback';
import { accentOf, fmt, initials, onColor, ratingLabel, thumbUrl } from '../../src/lib/format';
import { COLORS, RADIUS, SHADOW, sheet, FONTS } from '../../src/theme';

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://samaboutik-nine.vercel.app';
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dateLabel = (iso) => {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function Stars({ value, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} size={size} color={COLORS.gold} />
      ))}
    </View>
  );
}

function Choice({ label, options, value, onChange, accent, accentText }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{label}{value ? <Text style={styles.blockValue}> · {value}</Text> : null}</Text>
      <View style={styles.choices}>
        {options.map((o) => {
          const on = value === o;
          return (
            <Pressable key={o} onPress={() => onChange(on ? null : o)} style={[styles.choice, on && { backgroundColor: accent, borderColor: accent }]} accessibilityState={{ selected: on }}>
              <Text style={[styles.choiceText, on && { color: accentText }]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProductScreen() {
  const { id, shop: shopParam } = useLocalSearchParams();
  const productId = String(id || '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cart = useCart();

  const cached = cachedProduct(productId);
  const [data, setData] = useState(cached ? { ...cached, reviews: null } : null);
  const [status, setStatus] = useState(cached ? 'ready' : 'loading'); // loading | ready | missing | error
  const [photo, setPhoto] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [notice, setNotice] = useState(null); // { text, warn }
  const fade = useRef(new Animated.Value(0)).current;
  const noticeTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const fresh = await fetchProduct(productId);
      if (!fresh) { setStatus('missing'); return; }
      setData(fresh);
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const product = data?.product;
  const merchant = data?.merchant;
  const shopName = merchant?.shop_name || String(shopParam || '');
  const images = useMemo(() => galleryOf(product), [product]);
  const options = useMemo(() => (product ? productOptions(product) : { sizes: [], colors: [], features: [] }), [product]);
  const reviews = data?.reviews;
  const average = reviews?.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : 0;
  const accent = accentOf(merchant?.theme_color);
  const accentText = onColor(accent);
  const soldOut = isSoldOut(product);
  const cartCount = cart.count(shopName);

  const goBack = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  const share = useCallback(() => {
    Share.share({ message: `${product.name} · ${fmt(product.price_fcfa)} F chez ${shopName} : ${SITE_URL}/boutique/${encodeURIComponent(shopName)}?produit=${encodeURIComponent(product.id)}` });
  }, [product, shopName]);

  const showNotice = useCallback((text, warn = false) => {
    clearTimeout(noticeTimer.current);
    setNotice({ text, warn });
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    noticeTimer.current = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setNotice(null));
    }, 2600);
  }, [fade]);

  const addToCart = useCallback(() => {
    if (options.sizes.length && !size) { buzzWarning(); return showNotice(options.legacyList ? 'Choisissez une option.' : 'Choisissez une taille.', true); }
    if (options.colors.length && !color) { buzzWarning(); return showNotice('Choisissez une couleur.', true); }
    const result = cart.add(shopName, product, variantLabel(size, color), merchant);
    if (!result.ok) { buzzWarning(); return showNotice(result.message, true); }
    buzzSuccess();
    return showNotice(`Ajouté au panier · ${result.count} article${result.count > 1 ? 's' : ''} de ${shopName}`);
  }, [options, size, color, cart, shopName, product, showNotice]);

  if (status !== 'ready' || !product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Pressable onPress={goBack} style={[styles.round, styles.backFixed, { top: insets.top + 8 }]} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </Pressable>
        {status === 'loading' ? (
          <ActivityIndicator size="large" color={COLORS.brand} />
        ) : (
          <>
            <Ionicons name={status === 'missing' ? 'bag-remove-outline' : 'cloud-offline-outline'} size={44} color={COLORS.faint} />
            <Text style={styles.centerTitle}>{status === 'missing' ? 'Produit indisponible' : 'Produit introuvable pour le moment'}</Text>
            <Text style={styles.centerText}>{status === 'missing' ? 'Ce produit n’est plus en vente.' : 'Vérifiez votre connexion puis réessayez.'}</Text>
            {status === 'error' ? (
              <Pressable onPress={() => { setStatus('loading'); load(); }} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable>
            ) : null}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Photos */}
        <View style={{ width, height: width, backgroundColor: '#efece6' }}>
          {images.length ? (
            <FlatList
              data={images}
              keyExtractor={(uri, i) => `${i}-${uri}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => <Image source={item} placeholder={thumbUrl(item)} style={{ width, height: width }} contentFit="cover" transition={200} />}
            />
          ) : (
            <View style={styles.noPhoto}><Ionicons name="image-outline" size={48} color={COLORS.faint} /></View>
          )}
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((uri, i) => <View key={`${i}-${uri}`} style={[styles.dot, i === photo && styles.dotOn]} />)}
            </View>
          ) : null}
          {soldOut ? <View style={styles.soldOutBand}><Text style={styles.soldOutText}>Épuisé</Text></View> : null}
        </View>

        <View style={styles.content}>
          {product.category ? <Text style={[styles.category, { color: accent === '#3b2fc9' ? COLORS.brand : COLORS.muted }]}>{product.category}</Text> : null}
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{fmt(product.price_fcfa)} F</Text>
            {soldOut ? (
              <View style={[styles.badge, { backgroundColor: COLORS.ink }]}><Text style={[styles.badgeText, { color: '#fff' }]}>Épuisé</Text></View>
            ) : isLowStock(product) ? (
              <View style={[styles.badge, { backgroundColor: COLORS.goldSoft }]}><Text style={[styles.badgeText, { color: COLORS.goldInk }]}>Plus que {product.stock}</Text></View>
            ) : typeof product.stock === 'number' ? (
              <View style={[styles.badge, { backgroundColor: '#e8f7ee' }]}><Text style={[styles.badgeText, { color: '#13723f' }]}>En stock</Text></View>
            ) : null}
          </View>
          {reviews?.length ? (
            <View style={styles.ratingRow}>
              <Stars value={average} />
              <Text style={styles.ratingText}>{ratingLabel(average)} · {reviews.length} avis</Text>
            </View>
          ) : null}

          {options.sizes.length ? (
            <Choice label={options.legacyList ? 'Option' : 'Taille'} options={options.sizes} value={size} onChange={setSize} accent={accent} accentText={accentText} />
          ) : null}
          {options.colors.length ? (
            <Choice label="Couleur" options={options.colors} value={color} onChange={setColor} accent={accent} accentText={accentText} />
          ) : null}

          {product.description ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {options.features.length ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Caractéristiques</Text>
              <View style={styles.features}>
                {options.features.map(([k, v], i) => (
                  <View key={`${k}-${i}`} style={[styles.featureRow, i > 0 && styles.featureLine]}>
                    <Text style={styles.featureKey}>{k}</Text>
                    <Text style={styles.featureValue}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {merchant ? (
            <Pressable onPress={() => router.push({ pathname: '/boutique/[shop]', params: { shop: merchant.shop_name } })} style={styles.seller}>
              {merchant.logo_url ? (
                <Image source={thumbUrl(merchant.logo_url)} style={styles.sellerLogo} contentFit="cover" />
              ) : (
                <View style={[styles.sellerLogo, { backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: accentText, fontFamily: FONTS.extrabold }}>{initials(merchant.shop_name)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerLabel}>Vendu par</Text>
                <Text style={styles.sellerName} numberOfLines={1}>{merchant.shop_name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.faint} />
            </Pressable>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Avis des clients{reviews?.length ? ` (${reviews.length})` : ''}</Text>
            {reviews === null ? (
              <ActivityIndicator color={COLORS.brand} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
            ) : reviews.length === 0 ? (
              <Text style={styles.muted}>Pas encore d’avis sur ce produit.</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.review}>
                  <View style={styles.reviewHead}>
                    <Text style={styles.reviewName}>{r.customer_name || 'Client'}</Text>
                    {r.verified ? (
                      <View style={styles.verified}><Ionicons name="checkmark-circle" size={12} color="#13723f" /><Text style={styles.verifiedText}>Achat vérifié</Text></View>
                    ) : null}
                  </View>
                  <View style={styles.reviewMeta}>
                    <Stars value={Number(r.rating) || 0} size={12} />
                    <Text style={styles.reviewDate}>{dateLabel(r.created_at)}</Text>
                  </View>
                  {r.comment ? <Text style={styles.reviewText}>{r.comment}</Text> : null}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Boutons sur la photo */}
      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={goBack} style={styles.round} accessibilityLabel="Retour" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={share} style={styles.round} accessibilityLabel="Partager le produit" hitSlop={8}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.ink} />
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/panier/[shop]', params: { shop: shopName } })} style={styles.round} accessibilityLabel={`Panier : ${cartCount} article${cartCount > 1 ? 's' : ''}`} hitSlop={8}>
            <Ionicons name="bag-handle-outline" size={20} color={COLORS.ink} />
            {cartCount ? <View style={[styles.cartBadge, { backgroundColor: accent }]}><Text style={[styles.cartBadgeText, { color: accentText }]}>{cartCount}</Text></View> : null}
          </Pressable>
        </View>
      </View>

      {/* Message après l'ajout */}
      {notice ? (
        <Animated.View style={[styles.notice, notice.warn && styles.noticeWarn, { bottom: 92 + insets.bottom, opacity: fade }]} pointerEvents="none">
          <Ionicons name={notice.warn ? 'alert-circle' : 'checkmark-circle'} size={18} color={notice.warn ? COLORS.goldInk : '#fff'} />
          <Text style={[styles.noticeText, notice.warn && { color: COLORS.goldInk }]}>{notice.text}</Text>
        </Animated.View>
      ) : null}

      {/* Barre d'achat */}
      <View style={[styles.buyBar, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.buyLabel}>Prix</Text>
          <Text style={styles.buyPrice}>{fmt(product.price_fcfa)} F</Text>
        </View>
        <Pressable
          onPress={addToCart}
          disabled={soldOut}
          style={({ pressed }) => [styles.buyButton, { backgroundColor: soldOut ? COLORS.line : accent }, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name={soldOut ? 'close-circle-outline' : 'bag-add-outline'} size={20} color={soldOut ? COLORS.muted : accentText} />
          <Text style={[styles.buyText, { color: soldOut ? COLORS.muted : accentText }]}>{soldOut ? 'Épuisé' : 'Ajouter au panier'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.bg },
  centerTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  centerText: { color: COLORS.muted, fontSize: 14, marginTop: 6, textAlign: 'center' },
  retry: { marginTop: 18, backgroundColor: COLORS.ink, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.md },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  backFixed: { position: 'absolute', left: 16 },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  cartBadge: { position: 'absolute', top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 11, fontWeight: '900' },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 34, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotOn: { width: 20, backgroundColor: '#fff' },
  soldOutBand: { position: 'absolute', top: '45%', alignSelf: 'center', backgroundColor: COLORS.ink, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  soldOutText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  content: { marginTop: -22, backgroundColor: COLORS.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 20 },
  category: { fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { color: COLORS.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.4, marginTop: 4, lineHeight: 29 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  price: { color: COLORS.ink, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  ratingText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  block: { marginTop: 22 },
  blockTitle: { color: COLORS.ink, fontSize: 16.5, fontWeight: '900', marginBottom: 10 },
  blockValue: { color: COLORS.muted, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minWidth: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.sm + 2, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center' },
  choiceText: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  description: { color: COLORS.ink, fontSize: 14.5, lineHeight: 22, opacity: 0.85 },
  features: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 14 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11 },
  featureLine: { borderTopWidth: 1, borderTopColor: COLORS.line },
  featureKey: { color: COLORS.muted, fontSize: 13.5, fontWeight: '600' },
  featureValue: { color: COLORS.ink, fontSize: 13.5, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  seller: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.line },
  sellerLogo: { width: 44, height: 44, borderRadius: 12 },
  sellerLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  sellerName: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  muted: { color: COLORS.muted, fontSize: 14 },
  review: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewName: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#e8f7ee', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  verifiedText: { color: '#13723f', fontSize: 11, fontWeight: '800' },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  reviewDate: { color: COLORS.faint, fontSize: 12 },
  reviewText: { color: COLORS.ink, fontSize: 14, lineHeight: 20, marginTop: 6, opacity: 0.85 },
  notice: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.ink, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, ...SHADOW,
  },
  noticeWarn: { backgroundColor: COLORS.goldSoft },
  noticeText: { color: '#fff', fontSize: 13.5, fontWeight: '700', flex: 1 },
  buyBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line,
  },
  buyLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  buyPrice: { color: COLORS.ink, fontSize: 19, fontWeight: '900' },
  buyButton: { flex: 1, height: 52, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buyText: { fontSize: 16, fontWeight: '900' },
});
