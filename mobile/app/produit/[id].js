// Fiche produit : grande photo dans une carte (badge, étiquette de prix, boutique, plein écran, miniatures),
// onglets Détails / Avis / Livraison, tailles en ronds, couleurs en pastilles, quantité,
// « Ajouter au panier » et « Acheter maintenant ».
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Pressable, ScrollView, Share, Text, View, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cachedProduct, fetchProduct, galleryOf, isLowStock, isSoldOut, rememberProduct, zonesOf } from '../../src/lib/shop';
import { DEPOSIT_PERCENT, productOptions } from '../../src/lib/shared';
import { addRecent } from '../../src/lib/recent';
import { useCart, variantLabel } from '../../src/lib/cart';
import { buzzLight, buzzSuccess, buzzWarning } from '../../src/lib/feedback';
import { useFavorites } from '../../src/lib/favorites';
import HeartButton from '../../src/components/HeartButton';
import ProductCard from '../../src/components/ProductCard';
import ImageViewer from '../../src/components/ImageViewer';
import { FadeIn, Glass, GradientButton, PressScale, gradientOf } from '../../src/components/ui';
import { fetchCatalog, fetchShops } from '../../src/lib/shops';
import { categoryIcon, categoryToneIndex, featureIcon } from '../../src/lib/categories';
import { accentOf, fmt, initials, onColor, ratingLabel, swatchOf, thumbUrl } from '../../src/lib/format';
import { COLORS, GRADIENTS, RADIUS, SHADOW, SOFT, sheet, FONTS } from '../../src/theme';

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://samaboutik-nine.vercel.app';
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dateLabel = (iso) => {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const SIDE = 16;
const MULTI = ['#f472b6', '#f6c768', '#2dd4bf', '#8a7cf1'];

function Stars({ value, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} size={size} color={COLORS.gold} />
      ))}
    </View>
  );
}

// Titre de section précédé d'une icône dorée
function BlockTitle({ icon, children }) {
  return (
    <View style={styles.blockHead}>
      <View style={styles.blockIcon}><Ionicons name={icon} size={15} color={COLORS.goldInk} /></View>
      <Text style={[styles.blockTitle, { marginBottom: 0 }]}>{children}</Text>
    </View>
  );
}

// Pastille d'une couleur (ou initiale si la couleur n'est pas reconnue)
function Dot({ name, size = 16 }) {
  const hex = swatchOf(name);
  if (hex === 'multi') return <LinearGradient colors={MULTI} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }]} />;
  return <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: hex || COLORS.raised }]} />;
}

// Tailles : ronds (lettres courtes) ou pilules (options longues)
function Sizes({ label, options, value, onChange, tint, ink }) {
  return (
    <View style={styles.block}>
      <BlockTitle icon="resize-outline">{label}{value ? <Text style={styles.blockValue}> · {value}</Text> : null}</BlockTitle>
      <View style={styles.sizes}>
        {options.map((o) => {
          const on = value === o;
          const round = String(o).length <= 4;
          return (
            <Pressable key={o} onPress={() => { buzzLight(); onChange(on ? null : o); }} style={[round ? styles.sizeRound : styles.sizePill, on && { backgroundColor: tint, borderColor: tint }]} accessibilityState={{ selected: on }} accessibilityLabel={`${label} ${o}`}>
              <Text style={[styles.sizeText, on && { color: ink }]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Couleurs : pastilles dans une pilule, avec le nom de la couleur choisie
function Colors({ options, value, onChange, tint }) {
  return (
    <View style={styles.colorPill}>
      <View style={styles.colorIcon}><Ionicons name="color-palette-outline" size={18} color={COLORS.goldInk} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.colorLabel}>Couleur</Text>
        <Text style={styles.colorValue} numberOfLines={1}>{value || 'À choisir'}</Text>
      </View>
      <View style={styles.colorDots}>
        {options.map((o) => {
          const on = value === o;
          return (
            <Pressable key={o} onPress={() => { buzzLight(); onChange(on ? null : o); }} style={[styles.colorRing, on && { borderColor: tint }]} accessibilityState={{ selected: on }} accessibilityLabel={`Couleur ${o}`} hitSlop={4}>
              <Dot name={o} size={24} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Résumé des avis : moyenne, étoiles, répartition par note
function ReviewSummary({ reviews, average }) {
  const counts = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => Math.round(Number(r.rating)) === n).length);
  const max = Math.max(1, ...counts);
  return (
    <View style={styles.summary}>
      <View style={styles.summaryLeft}>
        <Text style={styles.summaryValue}>{ratingLabel(average)}</Text>
        <Stars value={average} size={13} />
        <Text style={styles.summaryCount}>{reviews.length} avis</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        {counts.map((c, i) => (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barLabel}>{5 - i}</Text>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(c / max) * 100}%` }]} /></View>
            <Text style={styles.barCount}>{c}</Text>
          </View>
        ))}
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
  const favorites = useFavorites();

  const cached = cachedProduct(productId);
  const [data, setData] = useState(cached ? { ...cached, reviews: null } : null);
  const [status, setStatus] = useState(cached ? 'ready' : 'loading'); // loading | ready | missing | error
  const [photo, setPhoto] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [notice, setNotice] = useState(null); // { text, warn, cart }
  const [quantity, setQuantity] = useState(1);
  const [similar, setSimilar] = useState([]);
  const [tab, setTab] = useState('details'); // details | avis | livraison
  const [viewerAt, setViewerAt] = useState(null); // photo ouverte en plein écran
  const fade = useRef(new Animated.Value(0)).current;
  const noticeTimer = useRef(null);
  const gallery = useRef(null);

  const load = useCallback(async () => {
    try {
      const fresh = await fetchProduct(productId);
      if (!fresh) { setStatus('missing'); return; }
      setData(fresh);
      setStatus('ready');
      addRecent(fresh.product, fresh.merchant);
    } catch {
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  useEffect(() => { setStatusBarStyle('light'); }, []);
  useEffect(() => {
    let alive = true;
    const merchantId = data?.product?.merchant_id;
    if (!merchantId) return undefined;
    fetchShops().then((list) => fetchCatalog(list)).then((catalog) => {
      if (alive) setSimilar(catalog.filter((p) => p.merchant_id === merchantId && String(p.id) !== productId).slice(0, 8));
    }).catch(() => {});
    return () => { alive = false; };
  }, [data?.product?.merchant_id, productId]);

  const product = data?.product;
  const merchant = data?.merchant;
  const shopName = merchant?.shop_name || String(shopParam || '');
  const images = useMemo(() => galleryOf(product), [product]);
  const options = useMemo(() => (product ? productOptions(product) : { sizes: [], colors: [], features: [] }), [product]);
  const reviews = data?.reviews;
  const average = reviews?.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : 0;
  const accent = accentOf(merchant?.theme_color);
  const tint = gradientOf(accent)[0]; // couleur des choix (or si la boutique n'a pas de couleur lisible)
  const tintInk = onColor(tint);
  const soldOut = isSoldOut(product);
  const cartCount = cart.count(shopName);
  const zones = zonesOf(merchant);

  const goBack = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  const share = useCallback(() => {
    Share.share({ message: `${product.name} · ${fmt(product.price_fcfa)} F chez ${shopName} : ${SITE_URL}/boutique/${encodeURIComponent(shopName)}?produit=${encodeURIComponent(product.id)}` });
  }, [product, shopName]);
  const openCart = useCallback(() => router.push({ pathname: '/panier/[shop]', params: { shop: shopName } }), [router, shopName]);

  const showNotice = useCallback((text, warn = false, withCart = false) => {
    clearTimeout(noticeTimer.current);
    setNotice({ text, warn, cart: withCart });
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    noticeTimer.current = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setNotice(null));
    }, 3200);
  }, [fade]);

  // Ajoute la quantité choisie ; renvoie le nombre d'articles ajoutés (0 si un choix manque).
  const addToCart = useCallback((silent = false) => {
    if (options.sizes.length && !size) { buzzWarning(); setTab('details'); showNotice(options.legacyList ? 'Choisissez une option.' : 'Choisissez une taille.', true); return 0; }
    if (options.colors.length && !color) { buzzWarning(); setTab('details'); showNotice('Choisissez une couleur.', true); return 0; }
    let added = 0;
    let last = null;
    for (let i = 0; i < quantity; i += 1) {
      last = cart.add(shopName, product, variantLabel(size, color), merchant);
      if (!last.ok) break;
      added += 1;
    }
    if (!added) { buzzWarning(); showNotice(last?.message || 'Ajout impossible.', true); return 0; }
    buzzSuccess();
    setQuantity(1);
    if (!silent) showNotice(added < quantity ? `${added} ajouté${added > 1 ? 's' : ''} · ${last.message}` : `${added} ajouté${added > 1 ? 's' : ''} au panier`, false, true);
    return added;
  }, [options, size, color, cart, shopName, product, showNotice, quantity, merchant]);
  const buyNow = useCallback(() => { if (addToCart(true)) openCart(); }, [addToCart, openCart]);

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

  const photoWidth = width - SIDE * 2;
  const photoHeight = Math.round(photoWidth * 1.05);
  const stock = typeof product.stock === 'number' ? product.stock : 99;
  const since = Date.parse(product.published_at || product.created_at || '');
  const isNew = Number.isFinite(since) && Date.now() - since < 21 * 864e5;
  const badge = soldOut ? null : isNew ? 'Nouveauté' : !options.sizes.length ? 'Taille unique' : average >= 4.5 && reviews?.length >= 3 ? 'Très bien noté' : null;
  const tabs = [['details', 'Détails', 'information-circle-outline'], ['avis', `Avis${reviews?.length ? ` (${reviews.length})` : ''}`, 'star-outline'], ['livraison', 'Livraison', 'bicycle-outline']];
  const tone = SOFT[categoryToneIndex(product.category) % SOFT.length];

  return (
    <View style={styles.screen}>
      {/* En-tête : retour, titre, partager, panier */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={goBack} style={styles.round} accessibilityLabel="Retour" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Détails</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={share} style={styles.round} accessibilityLabel="Partager le produit" hitSlop={8}>
            <Ionicons name="share-social-outline" size={19} color={COLORS.ink} />
          </Pressable>
          <Pressable onPress={openCart} style={styles.round} accessibilityLabel={`Panier : ${cartCount} article${cartCount > 1 ? 's' : ''}`} hitSlop={8}>
            <Ionicons name="bag-handle-outline" size={19} color={COLORS.ink} />
            {cartCount ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View> : null}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 170 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Photo dans une grande carte */}
        <View style={[styles.photoCard, { height: photoHeight }]}>
          {images.length ? (
            <FlatList
              ref={gallery}
              data={images}
              keyExtractor={(uri, i) => `${i}-${uri}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / photoWidth))}
              getItemLayout={(_, i) => ({ length: photoWidth, offset: photoWidth * i, index: i })}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => setViewerAt(index)} accessibilityLabel="Voir la photo en plein écran">
                  <Image source={item} placeholder={thumbUrl(item)} style={{ width: photoWidth, height: photoHeight }} contentFit="cover" transition={200} />
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.noPhoto}><Ionicons name="image-outline" size={48} color={COLORS.faint} /></View>
          )}
          <LinearGradient colors={['transparent', 'rgba(7,6,26,0.55)']} style={styles.photoShade} pointerEvents="none" />
          {badge ? <View style={styles.tiltBadge}><Text style={styles.tiltBadgeText}>{badge}</Text></View> : null}
          {/* Coin découpé avec le cœur */}
          <View style={styles.notch}>
            <HeartButton active={favorites.isProduct(product.id)} onToggle={() => favorites.toggleProduct(product, merchant)} size={40} />
          </View>
          {images.length ? (
            <Pressable onPress={() => setViewerAt(photo)} style={styles.expand} accessibilityLabel="Agrandir les photos" hitSlop={6}>
              <Ionicons name="expand-outline" size={15} color="#fff" />
              {images.length > 1 ? <Text style={styles.expandText}>{photo + 1}/{images.length}</Text> : null}
            </Pressable>
          ) : null}
          <View style={styles.photoChips}>
            {merchant ? (
              <Pressable onPress={() => router.push({ pathname: '/boutique/[shop]', params: { shop: merchant.shop_name } })} style={styles.shopChip} accessibilityLabel={`Voir la boutique ${merchant.shop_name}`}>
                <View style={[styles.shopChipIcon, { backgroundColor: tint }]}><Ionicons name="storefront" size={12} color={tintInk} /></View>
                <Text style={styles.shopChipText}>Boutique</Text>
              </Pressable>
            ) : null}
            <View style={styles.priceTag}><Text style={styles.priceTagText}>{fmt(product.price_fcfa)} F</Text></View>
          </View>
          {soldOut ? <View style={styles.soldOutBand}><Text style={styles.soldOutText}>Épuisé</Text></View> : null}
        </View>

        {images.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {images.map((uri, i) => (
              <Pressable key={`${i}-${uri}`} onPress={() => { setPhoto(i); gallery.current?.scrollToIndex({ index: i, animated: true }); }} style={[styles.thumb, i === photo && styles.thumbOn]} accessibilityLabel={`Photo ${i + 1}`}>
                <Image source={thumbUrl(uri)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.content}>
          {/* Nom, boutique, prix et couleurs */}
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.subtitleRow}>
            {product.category ? <><Ionicons name={categoryIcon(product.category)} size={14} color={COLORS.brand} /><Text style={styles.subtitle} numberOfLines={1}>{product.category}</Text></> : null}
            {product.category && shopName ? <Text style={styles.subtitleDot}>•</Text> : null}
            {shopName ? <><Ionicons name="storefront-outline" size={14} color={COLORS.goldInk} /><Text style={styles.subtitle} numberOfLines={1}>{shopName}</Text></> : null}
          </View>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>{options.sizes.length || options.colors.length ? 'À partir de' : 'Prix'}</Text>
              <Text style={styles.price}>{fmt(product.price_fcfa)}<Text style={styles.priceCurrency}> F</Text></Text>
            </View>
            {options.colors.length ? (
              <View style={styles.headDots}>{options.colors.slice(0, 5).map((c) => <Dot key={c} name={c} size={18} />)}</View>
            ) : null}
          </View>
          <View style={styles.statusRow}>
            {soldOut ? (
              <View style={[styles.badge, { backgroundColor: COLORS.raised }]}><Text style={[styles.badgeText, { color: COLORS.ink }]}>Épuisé</Text></View>
            ) : isLowStock(product) ? (
              <View style={[styles.badge, { backgroundColor: COLORS.goldSoft }]}><Text style={[styles.badgeText, { color: COLORS.goldInk }]}>Plus que {product.stock}</Text></View>
            ) : typeof product.stock === 'number' ? (
              <View style={[styles.badge, { backgroundColor: COLORS.greenSoft }]}><Text style={[styles.badgeText, { color: COLORS.green }]}>En stock</Text></View>
            ) : null}
            {reviews?.length ? (
              <Pressable onPress={() => setTab('avis')} style={styles.ratingRow} accessibilityLabel={`Note ${ratingLabel(average)} sur 5, ${reviews.length} avis`}>
                <Stars value={average} size={13} />
                <Text style={styles.ratingText}>{ratingLabel(average)} · {reviews.length} avis</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Avantages illustrés */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlights} style={{ marginHorizontal: -18 }}>
            {[
              product.category ? [categoryIcon(product.category), product.category, tone] : null,
              ['bicycle', zones.length ? `Livraison dès ${fmt(zones[0].price)} F` : 'Livraison à domicile', SOFT[0]],
              ['cash-outline', 'Paiement à la livraison', SOFT[2]],
              ['phone-portrait-outline', 'Wave · Orange Money', SOFT[4]],
              ['key-outline', 'Remise avec code secret', SOFT[5]],
              ['shield-checkmark-outline', 'Avis vérifiés', SOFT[3]],
            ].filter(Boolean).map(([icon, text, t]) => (
              <View key={text} style={styles.highlight}>
                <View style={[styles.highlightIcon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={16} color={t.fg} /></View>
                <Text style={styles.highlightText}>{text}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Onglets */}
          <View style={styles.tabs} accessibilityRole="tablist">
            {tabs.map(([key, label, icon]) => {
              const on = tab === key;
              return (
                <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <Ionicons name={on ? icon.replace('-outline', '') : icon} size={14} color={on ? COLORS.goldInk : COLORS.muted} />
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'details' ? (
            <FadeIn from={8}>
              {options.sizes.length ? (
                <Sizes label={options.legacyList ? 'Option' : 'Taille'} options={options.sizes} value={size} onChange={setSize} tint={tint} ink={tintInk} />
              ) : null}
              {options.colors.length ? <Colors options={options.colors} value={color} onChange={setColor} tint={tint} /> : null}

              {product.description ? (
                <View style={styles.block}>
                  <BlockTitle icon="document-text-outline">Description</BlockTitle>
                  <Text style={styles.description}>{product.description}</Text>
                </View>
              ) : null}

              {options.features.length ? (
                <View style={styles.block}>
                  <BlockTitle icon="list-outline">Caractéristiques</BlockTitle>
                  <View style={styles.features}>
                    {options.features.map(([k, v], i) => (
                      <View key={`${k}-${i}`} style={[styles.featureRow, i > 0 && styles.featureLine]}>
                        <View style={styles.featureKeyRow}><Ionicons name={featureIcon(k)} size={15} color={COLORS.brand} /><Text style={styles.featureKey}>{k}</Text></View>
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
                      <Text style={{ color: onColor(accent), fontFamily: FONTS.extrabold }}>{initials(merchant.shop_name)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sellerLabel}>Vendu par</Text>
                    <Text style={styles.sellerName} numberOfLines={1}>{merchant.shop_name}</Text>
                  </View>
                  <View style={styles.sellerGo}><Text style={styles.sellerGoText}>Voir</Text><Ionicons name="chevron-forward" size={14} color={COLORS.ink} /></View>
                </Pressable>
              ) : null}
            </FadeIn>
          ) : null}

          {tab === 'avis' ? (
            <FadeIn from={8} style={styles.block}>
              {reviews === null ? (
                <ActivityIndicator color={COLORS.brand} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
              ) : reviews.length === 0 ? (
                <View style={styles.emptyReviews}>
                  <Ionicons name="chatbubbles-outline" size={30} color={COLORS.faint} />
                  <Text style={styles.emptyReviewsTitle}>Pas encore d’avis</Text>
                  <Text style={styles.muted}>Après la livraison, les clients peuvent noter ce produit depuis le suivi de leur commande.</Text>
                </View>
              ) : (
                <>
                  <ReviewSummary reviews={reviews} average={average} />
                  {reviews.map((r) => (
                    <View key={r.id} style={styles.review}>
                      <View style={styles.reviewHead}>
                        <View style={styles.reviewAvatar}><Text style={styles.reviewAvatarText}>{initials(r.customer_name || 'Client')}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewName}>{r.customer_name || 'Client'}</Text>
                          <View style={styles.reviewMeta}><Stars value={Number(r.rating) || 0} size={11} /><Text style={styles.reviewDate}>{dateLabel(r.created_at)}</Text></View>
                        </View>
                        {r.verified ? <View style={styles.verified}><Ionicons name="checkmark-circle" size={12} color={COLORS.green} /><Text style={styles.verifiedText}>Achat vérifié</Text></View> : null}
                      </View>
                      {r.comment ? <Text style={styles.reviewText}>{r.comment}</Text> : null}
                    </View>
                  ))}
                </>
              )}
            </FadeIn>
          ) : null}

          {tab === 'livraison' ? (
            <FadeIn from={8} style={styles.block}>
              <View style={styles.infoCard}>
                {zones.map((z, i) => (
                  <View key={z.name} style={[styles.zoneRow, i > 0 && styles.featureLine]}>
                    <Ionicons name="location-outline" size={16} color={COLORS.brand} />
                    <Text style={styles.zoneName}>{z.name}</Text>
                    <Text style={styles.zonePrice}>{fmt(z.price)} F</Text>
                  </View>
                ))}
              </View>
              {[
                ['wallet-outline', 'Paiement à la livraison', `Un acompte de ${DEPOSIT_PERCENT} % confirme la commande ; le reste se paie au livreur.`],
                ['phone-portrait-outline', 'Paiement mobile', 'Wave, Orange Money, Free Money ou Wizall, en toute sécurité.'],
                ['key-outline', 'Code secret de livraison', 'Vous donnez votre code au livreur seulement quand vous avez reçu le colis.'],
                ['navigate-outline', 'Suivi en direct', 'Commande reçue, en préparation, en route : vous suivez tout depuis l’application.'],
              ].map(([icon, title, text]) => (
                <View key={title} style={styles.perk}>
                  <View style={styles.perkIcon}><Ionicons name={icon} size={18} color={COLORS.goldInk} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.perkTitle}>{title}</Text>
                    <Text style={styles.perkText}>{text}</Text>
                  </View>
                </View>
              ))}
            </FadeIn>
          ) : null}

          {similar.length ? (
            <View style={styles.block}>
              <BlockTitle icon="sparkles-outline">Vous aimerez aussi</BlockTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18 }}>
                {similar.map((p, i) => (
                  <FadeIn key={p.id} delay={i * 60}>
                    <ProductCard product={p} rating={p.ratingInfo} width={158} onPress={() => { rememberProduct(p, p.shop); router.push({ pathname: '/produit/[id]', params: { id: String(p.id), shop: shopName } }); }} />
                  </FadeIn>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Message après l'ajout */}
      {notice ? (
        <Animated.View style={[styles.notice, notice.warn && styles.noticeWarn, { bottom: 150 + insets.bottom, opacity: fade }]} pointerEvents={notice.cart ? 'auto' : 'none'}>
          <Ionicons name={notice.warn ? 'alert-circle' : 'checkmark-circle'} size={18} color={notice.warn ? COLORS.goldInk : '#7ee2a8'} />
          <Text style={[styles.noticeText, notice.warn && { color: COLORS.goldInk }]}>{notice.text}</Text>
          {notice.cart ? (
            <Pressable onPress={openCart} hitSlop={8} style={styles.noticeAction}>
              <Text style={styles.noticeActionText}>Voir le panier</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      <ImageViewer images={images} start={viewerAt} onClose={() => setViewerAt(null)} />

      {/* Barre d'achat : quantité, total, ajouter, acheter */}
      <Glass style={[styles.buyBar, { paddingBottom: insets.bottom + 12 }]} intensity={80}>
        {!soldOut ? (
          <View style={styles.buyTop}>
            <View style={styles.qty}>
              <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyButton} accessibilityLabel="Un de moins" hitSlop={6}>
                <Ionicons name="remove" size={18} color={COLORS.ink} />
              </Pressable>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Pressable onPress={() => setQuantity((q) => Math.min(stock, q + 1))} style={[styles.qtyButton, styles.qtyPlus]} accessibilityLabel="Un de plus" hitSlop={6}>
                <Ionicons name="add" size={18} color={COLORS.ctaInk} />
              </Pressable>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.total}>{fmt(product.price_fcfa * quantity)} F</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.buyButtons}>
          {soldOut ? (
            <GradientButton style={{ flex: 1 }} title="Épuisé" icon="close-circle-outline" colors={[COLORS.raised, COLORS.raised]} disabled onPress={() => {}} />
          ) : (
            <>
              <PressScale onPress={() => addToCart(false)} style={styles.addSoft} accessibilityLabel="Ajouter au panier">
                <Ionicons name="bag-add-outline" size={19} color={COLORS.ink} />
                <Text style={styles.addSoftText}>Ajouter</Text>
              </PressScale>
              <GradientButton style={{ flex: 1.35 }} title="Acheter" icon="flash" colors={GRADIENTS.gold} onPress={buyNow} />
            </>
          )}
        </View>
      </Glass>
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.bg },
  centerTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  centerText: { color: COLORS.muted, fontSize: 14, marginTop: 6, textAlign: 'center' },
  retry: { marginTop: 18, backgroundColor: COLORS.cta, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.md },
  retryText: { color: COLORS.ctaInk, fontWeight: '800', fontSize: 15 },
  backFixed: { position: 'absolute', left: 16 },
  // En-tête
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SIDE, paddingBottom: 10, backgroundColor: COLORS.bg },
  headerTitle: { flex: 1, textAlign: 'center', color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: -4, right: -4, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: COLORS.cta, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: COLORS.bg },
  cartBadgeText: { color: COLORS.ctaInk, fontSize: 10.5, fontWeight: '900' },
  // Photo
  photoCard: { marginHorizontal: SIDE, borderRadius: 30, overflow: 'hidden', backgroundColor: COLORS.raised, ...SHADOW },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%' },
  tiltBadge: {
    position: 'absolute', top: 18, left: 14, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, transform: [{ rotate: '-8deg' }],
    backgroundColor: 'rgba(10,8,32,0.82)', borderWidth: 1, borderColor: 'rgba(246,199,104,0.55)',
  },
  tiltBadgeText: { color: COLORS.goldInk, fontSize: 13, fontWeight: '800', fontFamily: FONTS.editorial, letterSpacing: 0 },
  notch: { position: 'absolute', top: 0, right: 0, padding: 8, paddingLeft: 10, paddingBottom: 10, backgroundColor: COLORS.bg, borderBottomLeftRadius: 26 },
  expand: {
    position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8,
    borderRadius: 999, backgroundColor: 'rgba(10,8,32,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  expandText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  photoChips: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  shopChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 5, paddingRight: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(10,8,32,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  shopChipIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shopChipText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  priceTag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.cta, transform: [{ rotate: '-6deg' }] },
  priceTagText: { color: COLORS.ctaInk, fontSize: 14, fontWeight: '900' },
  soldOutBand: { position: 'absolute', top: '45%', alignSelf: 'center', backgroundColor: 'rgba(7,6,26,0.85)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  soldOutText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  thumbs: { gap: 8, paddingHorizontal: SIDE, paddingTop: 12 },
  thumb: { width: 58, height: 58, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', opacity: 0.55 },
  thumbOn: { borderColor: COLORS.gold, opacity: 1 },
  // Contenu
  content: { paddingHorizontal: 18, paddingTop: 18 },
  name: { color: COLORS.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.7, lineHeight: 30 },
  subtitle: { color: COLORS.muted, fontSize: 14, flexShrink: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 },
  priceLabel: { color: COLORS.faint, fontSize: 12, fontWeight: '700' },
  price: { color: COLORS.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
  priceCurrency: { fontSize: 16, color: COLORS.goldInk },
  headDots: { flexDirection: 'row', gap: 6, paddingBottom: 6 },
  dot: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginTop: 20, padding: 4, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  tab: { flex: 1, height: 40, borderRadius: 999, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: COLORS.raised, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  tabText: { color: COLORS.muted, fontSize: 13.5, fontWeight: '700' },
  tabTextOn: { color: COLORS.ink, fontWeight: '800' },
  block: { marginTop: 20 },
  blockTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  blockValue: { color: COLORS.goldInk, fontWeight: '800' },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeRound: { minWidth: 46, height: 46, borderRadius: 23, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.line },
  sizePill: { paddingHorizontal: 16, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.line },
  sizeText: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  colorPill: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, paddingLeft: 18, paddingRight: 10, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  colorLabel: { color: COLORS.faint, fontSize: 11.5, fontWeight: '700' },
  colorValue: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  colorDots: { flexDirection: 'row', gap: 6 },
  colorRing: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  description: { color: COLORS.muted, fontSize: 14.5, lineHeight: 22 },
  features: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 14 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11 },
  featureLine: { borderTopWidth: 1, borderTopColor: COLORS.line },
  featureKey: { color: COLORS.muted, fontSize: 13.5 },
  featureValue: { color: COLORS.ink, fontSize: 13.5, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  seller: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.line },
  sellerLogo: { width: 46, height: 46, borderRadius: 14, overflow: 'hidden' },
  sellerLabel: { color: COLORS.faint, fontSize: 12 },
  sellerName: { color: COLORS.ink, fontSize: 15.5, fontWeight: '800' },
  sellerGo: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.raised },
  sellerGoText: { color: COLORS.ink, fontSize: 12.5, fontWeight: '800' },
  // Avis
  summary: { flexDirection: 'row', gap: 18, alignItems: 'center', padding: 16, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, marginBottom: 12 },
  summaryLeft: { alignItems: 'center', gap: 4 },
  summaryValue: { color: COLORS.ink, fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  summaryCount: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 10, color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  barTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: COLORS.raised, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.gold },
  barCount: { width: 18, textAlign: 'right', color: COLORS.faint, fontSize: 12 },
  review: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: COLORS.brand, fontSize: 12, fontWeight: '800' },
  reviewName: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  reviewDate: { color: COLORS.faint, fontSize: 11.5 },
  reviewText: { color: COLORS.ink, fontSize: 14, lineHeight: 20, marginTop: 8, opacity: 0.85 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.greenSoft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  verifiedText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  emptyReviews: { alignItems: 'center', gap: 6, padding: 20, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  emptyReviewsTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  muted: { color: COLORS.muted, fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
  // Livraison
  infoCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 14, marginBottom: 12 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  zoneName: { flex: 1, color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  zonePrice: { color: COLORS.goldInk, fontSize: 14, fontWeight: '800' },
  perk: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  perkIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.goldSoft, alignItems: 'center', justifyContent: 'center' },
  perkTitle: { color: COLORS.ink, fontSize: 14.5, fontWeight: '800' },
  perkText: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  // Messages et barre d'achat
  notice: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.raised, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, ...SHADOW,
  },
  noticeWarn: { backgroundColor: '#3b2c12', borderColor: 'rgba(246,199,104,0.35)' },
  noticeText: { color: '#fff', fontSize: 13.5, fontWeight: '700', flex: 1 },
  noticeAction: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  noticeActionText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  buyBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, gap: 12,
    borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.1)',
  },
  buyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  qtyButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.raised, alignItems: 'center', justifyContent: 'center' },
  qtyPlus: { backgroundColor: COLORS.cta },
  qtyValue: { minWidth: 30, textAlign: 'center', color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  totalLabel: { color: COLORS.faint, fontSize: 12, fontWeight: '700' },
  total: { color: COLORS.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  buyButtons: { flexDirection: 'row', gap: 10 },
  addSoft: {
    flex: 1, height: 56, borderRadius: RADIUS.md + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  addSoftText: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  blockIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: COLORS.goldSoft, alignItems: 'center', justifyContent: 'center' },
  colorIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.goldSoft, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  featureKeyRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  subtitleDot: { color: COLORS.faint, fontSize: 12, marginHorizontal: 2 },
  highlights: { gap: 8, paddingHorizontal: 18, paddingTop: 14 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 5, paddingRight: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  highlightIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  highlightText: { color: COLORS.ink, fontSize: 12.5, fontWeight: '700' },
});
