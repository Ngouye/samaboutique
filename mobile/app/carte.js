// Carte des boutiques : logos sur la carte, boutiques à faire glisser en bas, « Me localiser » (distances).
// Seules les boutiques dont le commerçant a rendu la position publique apparaissent (comme sur le site).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import ShopsMap from '../src/components/ShopsMap';
import { Glass, PressScale } from '../src/components/ui';
import { fetchShops } from '../src/lib/shops';
import { accentOf, fmt, initials, onColor, ratingLabel, thumbUrl } from '../src/lib/format';
import { buzzLight } from '../src/lib/feedback';
import { COLORS, RADIUS, SHADOW, sheet } from '../src/theme';

// Distance à vol d'oiseau en kilomètres.
function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const distanceLabel = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`);

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(320, width - 64);
  const map = useRef(null);
  const list = useRef(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  useEffect(() => { setStatusBarStyle('dark'); }, []);
  useEffect(() => {
    fetchShops().then((all) => setShops(all.filter((s) => s.latitude != null && s.longitude != null))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    if (!me) return shops;
    return [...shops]
      .map((s) => ({ ...s, distance: distanceKm(me, { lat: s.latitude, lng: s.longitude }) }))
      .sort((a, b) => a.distance - b.distance);
  }, [shops, me]);

  const focusShop = useCallback((name, scroll = true) => {
    setSelected(name);
    map.current?.select(name);
    const index = sorted.findIndex((s) => s.shop_name === name);
    if (scroll && index >= 0) list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, [sorted]);

  const locate = useCallback(async () => {
    buzzLight();
    setLocError('');
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocError('Autorisez la localisation pour voir les boutiques autour de vous.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMe(here);
      map.current?.showMe(here.lat, here.lng);
    } catch {
      setLocError('Position introuvable. Vérifiez que la localisation du téléphone est activée.');
    } finally {
      setLocating(false);
    }
  }, []);

  return (
    <View style={styles.screen}>
      <ShopsMap ref={map} shops={shops} onSelect={(name) => focusShop(name)} />

      {/* En-tête en verre */}
      <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Retour" hitSlop={8}>
          <Glass style={styles.round}><Ionicons name="chevron-back" size={22} color={COLORS.ink} /></Glass>
        </Pressable>
        <Glass style={styles.titlePill}>
          <Ionicons name="map" size={16} color={COLORS.brand} />
          <Text style={styles.title}>Carte des boutiques</Text>
          <View style={styles.count}><Text style={styles.countText}>{shops.length}</Text></View>
        </Glass>
        <Pressable onPress={locate} accessibilityLabel="Me localiser" hitSlop={8}>
          <Glass style={styles.round}>{locating ? <ActivityIndicator color={COLORS.brand} /> : <Ionicons name={me ? 'navigate' : 'navigate-outline'} size={20} color={COLORS.brand} />}</Glass>
        </Pressable>
      </View>
      {locError ? <Glass style={[styles.toast, { top: insets.top + 64 }]}><Text style={styles.toastText}>{locError}</Text></Glass> : null}

      {/* Boutiques à faire glisser */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]} pointerEvents="box-none">
        {loading ? (
          <Glass style={styles.info}><ActivityIndicator color={COLORS.brand} /><Text style={styles.infoText}>Chargement des boutiques…</Text></Glass>
        ) : !sorted.length ? (
          <Glass style={styles.info}><Ionicons name="location-outline" size={18} color={COLORS.muted} /><Text style={styles.infoText}>Aucune boutique n’a encore publié sa position.</Text></Glass>
        ) : (
          <FlatList
            ref={list}
            data={sorted}
            horizontal
            keyExtractor={(s) => s.shop_name}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: (width - cardWidth) / 2, gap: 12 }}
            getItemLayout={(_, index) => ({ length: cardWidth + 12, offset: (cardWidth + 12) * index, index })}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12));
              const shop = sorted[Math.max(0, Math.min(sorted.length - 1, index))];
              if (shop && shop.shop_name !== selected) focusShop(shop.shop_name, false);
            }}
            renderItem={({ item }) => {
              const accent = accentOf(item.theme_color);
              const on = item.shop_name === selected;
              const reviews = Number(item.reviews_count) || 0;
              return (
                <PressScale onPress={() => router.push({ pathname: '/boutique/[shop]', params: { shop: item.shop_name } })} style={[styles.card, { width: cardWidth }, on && styles.cardOn]}>
                  {item.logo_url ? (
                    <Image source={thumbUrl(item.logo_url)} style={styles.logo} contentFit="cover" />
                  ) : (
                    <View style={[styles.logo, { backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }]}><Text style={[styles.initials, { color: onColor(accent) }]}>{initials(item.shop_name)}</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.shop_name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      <Ionicons name="star" size={11} color={reviews ? COLORS.gold : COLORS.faint} /> {reviews ? ratingLabel(item.rating) : 'Nouvelle'} · {Number(item.products_count) || 0} produits{item.min_price_fcfa != null ? ` · dès ${fmt(item.min_price_fcfa)} F` : ''}
                    </Text>
                    {item.distance != null ? (
                      <View style={styles.distance}><Ionicons name="walk-outline" size={12} color={COLORS.brand} /><Text style={styles.distanceText}>à {distanceLabel(item.distance)}</Text></View>
                    ) : item.address ? <Text style={styles.address} numberOfLines={1}>{item.address}</Text> : null}
                  </View>
                  <View style={styles.go}><Ionicons name="arrow-forward" size={16} color="#fff" /></View>
                </PressScale>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: '#eef0f3' },
  top: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowOpacity: 0.15 },
  titlePill: { flex: 1, height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, ...SHADOW, shadowOpacity: 0.15 },
  title: { flex: 1, color: COLORS.ink, fontSize: 15.5, fontWeight: '800' },
  count: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  countText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  toast: { position: 'absolute', left: 14, right: 14, borderRadius: RADIUS.md, padding: 12, ...SHADOW },
  toastText: { color: COLORS.ink, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  info: { marginHorizontal: 16, borderRadius: RADIUS.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, ...SHADOW },
  infoText: { color: COLORS.ink, fontSize: 14, fontWeight: '600', flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 22, padding: 12, borderWidth: 2, borderColor: 'transparent', ...SHADOW, shadowOpacity: 0.18, shadowRadius: 18, elevation: 10 },
  cardOn: { borderColor: COLORS.brand },
  logo: { width: 58, height: 58, borderRadius: 17 },
  initials: { fontSize: 18, fontWeight: '800' },
  name: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  distance: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, alignSelf: 'flex-start', backgroundColor: COLORS.brandSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  distanceText: { color: COLORS.brand, fontSize: 11.5, fontWeight: '800' },
  address: { color: COLORS.faint, fontSize: 11.5, marginTop: 4 },
  go: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
});
