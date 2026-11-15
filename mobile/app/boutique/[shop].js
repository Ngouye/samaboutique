// Page d'une boutique : bannière, logo, description, note, contact WhatsApp, livraison et produits.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProductCard from '../../src/components/ProductCard';
import { fetchShop, productCategories, rememberShop, zonesOf } from '../../src/lib/shop';
import { useCart } from '../../src/lib/cart';
import { whatsappNumber } from '../../src/lib/shared';
import { accentOf, fmt, initials, onColor, ratingLabel, thumbUrl } from '../../src/lib/format';
import { COLORS, RADIUS, SHADOW, sheet } from '../../src/theme';

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://samaboutik-nine.vercel.app';
const GAP = 12;
const SIDE = 16;

export default function ShopScreen() {
  // Paramètre « shop » et non « name » : sur téléphone, « name » désigne déjà l'écran dans la navigation.
  const { shop: shopParam } = useLocalSearchParams();
  const shopName = String(shopParam || '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - SIDE * 2 - GAP) / 2);

  const [shop, setShop] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchShop(shopName);
      if (data) rememberShop(data.merchant, data.products);
      setShop(data);
      setStatus(data ? 'ready' : 'missing');
      setError('');
    } catch (e) {
      setError(/fetch|network/i.test(e?.message || '') ? 'Pas de connexion internet. Vérifiez votre réseau puis réessayez.' : e?.message || 'Impossible de charger la boutique.');
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, [shopName]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const goBack = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);

  const merchant = shop?.merchant;
  const products = useMemo(() => shop?.products || [], [shop]);
  const categories = useMemo(() => productCategories(products), [products]);
  const visible = useMemo(() => (category ? products.filter((p) => (p.category || 'Autres') === category) : products), [products, category]);
  const zones = useMemo(() => zonesOf(merchant), [merchant]);
  const accent = accentOf(merchant?.theme_color);
  const accentText = onColor(accent);
  const shopUrl = `${SITE_URL}/boutique/${encodeURIComponent(merchant?.shop_name || shopName)}`;
  const phone = whatsappNumber(merchant?.phone_number);

  const openWhatsApp = useCallback(() => {
    const text = `Bonjour ${merchant.shop_name}, je vous contacte depuis l'application SamaBoutik.`;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
  }, [merchant, phone]);
  const call = useCallback(() => Linking.openURL(`tel:+${phone}`), [phone]);
  const share = useCallback(() => {
    Share.share({ message: `Découvrez ${merchant.shop_name} sur SamaBoutik : ${shopUrl}` });
  }, [merchant, shopUrl]);

  const openProduct = useCallback((product) => {
    router.push({ pathname: '/produit/[id]', params: { id: String(product.id), shop: merchant?.shop_name || shopName } });
  }, [router, merchant, shopName]);

  const cart = useCart();
  const cartShop = merchant?.shop_name || shopName;
  const cartCount = cart.count(cartShop);
  const openCart = useCallback(() => router.push({ pathname: '/panier/[shop]', params: { shop: cartShop } }), [router, cartShop]);

  const topButtons = (light) => (
    <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable onPress={goBack} style={[styles.roundButton, light && styles.roundLight]} accessibilityLabel="Retour" hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      </Pressable>
      {merchant ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={share} style={[styles.roundButton, light && styles.roundLight]} accessibilityLabel="Partager la boutique" hitSlop={8}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.ink} />
          </Pressable>
          <Pressable onPress={openCart} style={[styles.roundButton, light && styles.roundLight]} accessibilityLabel={`Panier : ${cartCount} article${cartCount > 1 ? 's' : ''}`} hitSlop={8}>
            <Ionicons name="bag-handle-outline" size={20} color={COLORS.ink} />
            {cartCount ? <View style={[styles.cartBadge, { backgroundColor: accent }]}><Text style={[styles.cartBadgeText, { color: accentText }]}>{cartCount}</Text></View> : null}
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (status === 'loading' || status === 'missing' || status === 'error') {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {topButtons(true)}
        {status === 'loading' ? (
          <>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.centerText}>Ouverture de la boutique…</Text>
          </>
        ) : (
          <>
            <Ionicons name={status === 'missing' ? 'storefront-outline' : 'cloud-offline-outline'} size={44} color={COLORS.faint} />
            <Text style={styles.centerTitle}>{status === 'missing' ? 'Boutique introuvable' : 'Boutique indisponible'}</Text>
            <Text style={styles.centerText}>{status === 'missing' ? 'Cette boutique n’existe plus ou a changé de nom.' : error}</Text>
            {status === 'error' ? (
              <Pressable onPress={() => { setStatus('loading'); load(); }} style={styles.retry}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    );
  }

  const cover = merchant.banner_url || products.find((p) => p.image_url)?.image_url || null;
  const rating = shop.shopRating;

  const header = (
    <View>
      <View style={[styles.hero, { backgroundColor: accent, height: 190 + insets.top }]}>
        {cover ? <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : null}
        <View style={styles.heroShade} />
      </View>

      <View style={styles.infoCard}>
        <View style={styles.logoWrap}>
          {merchant.logo_url ? (
            <Image source={thumbUrl(merchant.logo_url)} style={styles.logo} contentFit="cover" />
          ) : (
            <View style={[styles.logo, styles.logoFallback, { backgroundColor: accent }]}>
              <Text style={[styles.logoInitials, { color: accentText }]}>{initials(merchant.shop_name)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.shopName}>{merchant.shop_name}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="star" size={13} color={rating ? COLORS.gold : COLORS.faint} />
            <Text style={styles.statText}>{rating ? `${ratingLabel(rating.average)} · ${rating.count} avis` : 'Nouvelle boutique'}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="pricetags-outline" size={13} color={COLORS.brand} />
            <Text style={styles.statText}>{products.length} produit{products.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {merchant.description ? (
          <Pressable onPress={() => setShowFullDescription((v) => !v)}>
            <Text style={styles.description} numberOfLines={showFullDescription ? undefined : 3}>{merchant.description}</Text>
            {merchant.description.length > 140 ? <Text style={[styles.more, { color: COLORS.brand }]}>{showFullDescription ? 'Voir moins' : 'Lire la suite'}</Text> : null}
          </Pressable>
        ) : null}

        {merchant.address ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color={COLORS.muted} />
            <Text style={styles.address}>{merchant.address}</Text>
          </View>
        ) : null}

        {phone ? (
          <View style={styles.actions}>
            <Pressable onPress={openWhatsApp} style={({ pressed }) => [styles.whatsapp, pressed && { opacity: 0.85 }]}>
              <Ionicons name="logo-whatsapp" size={19} color="#fff" />
              <Text style={styles.whatsappText}>WhatsApp</Text>
            </Pressable>
            <Pressable onPress={call} style={({ pressed }) => [styles.callButton, pressed && { opacity: 0.85 }]}>
              <Ionicons name="call-outline" size={18} color={COLORS.ink} />
              <Text style={styles.callText}>Appeler</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {zones.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Ionicons name="bicycle-outline" size={18} color={COLORS.ink} />
            <Text style={styles.sectionTitle}>Livraison</Text>
            <Text style={styles.sectionHint}>dès {fmt(zones[0].price)} F</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zones}>
            {zones.map((z) => (
              <View key={z.name} style={styles.zone}>
                <Text style={styles.zoneName} numberOfLines={1}>{z.name}</Text>
                <Text style={styles.zonePrice}>{fmt(z.price)} F</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.section, { marginBottom: 4 }]}>
        <View style={styles.sectionHead}>
          <Ionicons name="bag-handle-outline" size={18} color={COLORS.ink} />
          <Text style={styles.sectionTitle}>Produits</Text>
          <Text style={styles.sectionHint}>{visible.length}</Text>
        </View>
        {categories.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[null, ...categories].map((c) => {
              const on = category === c;
              return (
                <Pressable key={c || 'all'} onPress={() => setCategory(c)} style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}>
                  <Text style={[styles.chipText, on && { color: accentText }]}>{c || 'Tout'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {status === 'ready' && error ? <Text style={styles.inlineError}>{error}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(p) => String(p.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <ProductCard product={item} rating={shop.ratings[item.id]} width={cardWidth} onPress={() => openProduct(item)} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={38} color={COLORS.faint} />
            <Text style={styles.centerText}>Aucun produit en ligne pour le moment.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + (cartCount ? 100 : 28) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor="#fff" progressViewOffset={insets.top} />}
        showsVerticalScrollIndicator={false}
      />
      {topButtons(false)}
      {cartCount ? (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable onPress={openCart} style={({ pressed }) => [styles.cartBarButton, { backgroundColor: accent }, pressed && { opacity: 0.88 }]}>
            <Ionicons name="bag-handle" size={20} color={accentText} />
            <Text style={[styles.cartBarText, { color: accentText }]}>Voir le panier · {cartCount} article{cartCount > 1 ? 's' : ''}</Text>
            <Text style={[styles.cartBarAmount, { color: accentText }]}>{fmt(cart.subtotal(cartShop))} F</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { position: 'absolute', left: SIDE, right: SIDE, flexDirection: 'row', justifyContent: 'space-between' },
  roundButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', ...SHADOW },
  roundLight: { backgroundColor: COLORS.card },
  cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: 'rgba(247,246,242,0.96)' },
  cartBarButton: { height: 54, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, ...SHADOW },
  cartBarText: { flex: 1, fontSize: 15.5, fontWeight: '900' },
  cartBarAmount: { fontSize: 16, fontWeight: '900' },
  cartBadge: { position: 'absolute', top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 11, fontWeight: '900' },
  hero: { width: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,10,38,0.25)' },
  infoCard: { marginTop: -48, marginHorizontal: SIDE, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, paddingTop: 0, ...SHADOW },
  logoWrap: { marginTop: -34, width: 76, height: 76, borderRadius: 22, backgroundColor: COLORS.card, padding: 4, ...SHADOW },
  logo: { width: 68, height: 68, borderRadius: 18 },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoInitials: { fontSize: 24, fontWeight: '900' },
  shopName: { color: COLORS.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.5, marginTop: 10 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statText: { color: COLORS.ink, fontSize: 12.5, fontWeight: '700' },
  description: { color: COLORS.muted, fontSize: 14, lineHeight: 20.5, marginTop: 12 },
  more: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  address: { flex: 1, color: COLORS.ink, fontSize: 13.5, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  whatsapp: { flex: 1, height: 48, borderRadius: RADIUS.md, backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  whatsappText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  callButton: { flex: 1, height: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.card },
  callText: { color: COLORS.ink, fontWeight: '800', fontSize: 15 },
  section: { marginTop: 22, paddingHorizontal: SIDE },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  sectionHint: { color: COLORS.muted, fontSize: 13, fontWeight: '700', marginLeft: 'auto' },
  zones: { gap: 8, paddingRight: SIDE },
  zone: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12, paddingVertical: 9, maxWidth: 220 },
  zoneName: { color: COLORS.ink, fontSize: 12.5, fontWeight: '700' },
  zonePrice: { color: COLORS.brand, fontSize: 13.5, fontWeight: '900', marginTop: 2 },
  chips: { gap: 8, paddingBottom: 12, paddingRight: SIDE },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  chipText: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  inlineError: { color: COLORS.danger, fontSize: 12.5, marginBottom: 10 },
  row: { paddingHorizontal: SIDE, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.bg },
  centerTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  centerText: { color: COLORS.muted, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  retry: { marginTop: 18, backgroundColor: COLORS.ink, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.md },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
});
