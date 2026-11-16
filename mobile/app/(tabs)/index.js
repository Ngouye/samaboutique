// Accueil : grand en-tête en dégradé, recherche, bannières qui défilent, catégories colorées, boutiques,
// nouveautés de toutes les boutiques (ajout rapide au panier), toutes les boutiques.
// Au tout premier lancement, les pages de bienvenue s'affichent d'abord.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Logo from '../../src/components/Logo';
import ShopCard from '../../src/components/ShopCard';
import FeaturedShopCard from '../../src/components/FeaturedShopCard';
import ProductCard from '../../src/components/ProductCard';
import PromoCarousel from '../../src/components/PromoCarousel';
import Skeleton from '../../src/components/Skeleton';
import { FadeIn, PressScale, SectionHeader } from '../../src/components/ui';
import { fetchCatalog, fetchShops } from '../../src/lib/shops';
import { rememberProduct } from '../../src/lib/shop';
import { categoryIcon } from '../../src/lib/categories';
import { store } from '../../src/lib/storage';
import { useCart } from '../../src/lib/cart';
import { useFavorites } from '../../src/lib/favorites';
import { COLORS, GRADIENTS, RADIUS, SHADOW, SOFT, TAB_SPACE, sheet } from '../../src/theme';

const SIDE = 16;
const GAP = 12;

function HomeSkeleton({ cardWidth }) {
  return (
    <View style={{ paddingHorizontal: SIDE, marginTop: 24 }}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={{ alignItems: 'center', gap: 6 }}><Skeleton width={64} height={64} radius={22} /><Skeleton width={52} height={10} /></View>)}
      </View>
      <Skeleton height={22} width={150} style={{ marginTop: 28 }} />
      <Skeleton height={230} radius={RADIUS.lg} style={{ marginTop: 14 }} />
      <View style={{ flexDirection: 'row', gap: GAP, marginTop: 24 }}>
        {[0, 1].map((i) => <Skeleton key={i} width={cardWidth} height={cardWidth + 96} radius={RADIUS.lg} />)}
      </View>
    </View>
  );
}

function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - SIDE * 2 - GAP) / 2);
  const cart = useCart();
  const favorites = useFavorites();

  const [shops, setShops] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState('');

  // En-tête en dégradé : texte de la barre d'état en blanc sur cet onglet.
  useFocusEffect(useCallback(() => {
    setFirstName(String(store.get('client', {}).name || '').trim().split(/\s+/)[0] || '');
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []));

  const load = useCallback(async (refresh = false) => {
    try {
      const list = await fetchShops();
      setShops(list);
      setStatus('ready');
      setError('');
      setCatalog(await fetchCatalog(list, { refresh }).catch(() => []));
    } catch (e) {
      setError(/fetch|network/i.test(e?.message || '') ? 'Pas de connexion internet. Vérifiez votre réseau puis réessayez.' : e?.message || 'Impossible de charger les boutiques.');
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const refresh = useCallback(async () => { setRefreshing(true); await load(true); setRefreshing(false); }, [load]);

  const categories = useMemo(() => {
    const counts = new Map();
    catalog.forEach((p) => { const c = p.category || 'Autres'; counts.set(c, (counts.get(c) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [catalog]);
  const featured = useMemo(() => {
    const top = shops.filter((s) => s.featured);
    return top.length ? top : shops;
  }, [shops]);
  const latest = useMemo(() => catalog.slice(0, 8), [catalog]);

  const openShop = useCallback((shop) => router.push({ pathname: '/boutique/[shop]', params: { shop: shop.shop_name } }), [router]);
  const openProduct = useCallback((product) => {
    rememberProduct(product, product.shop);
    router.push({ pathname: '/produit/[id]', params: { id: String(product.id), shop: product.shop?.shop_name || '' } });
  }, [router]);
  const explore = useCallback((params = {}) => router.navigate({ pathname: '/explorer', params }), [router]);
  const cartCount = cart.totalCount();
  const favCount = favorites.count();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: TAB_SPACE + insets.bottom }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor="#fff" progressViewOffset={insets.top} />}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête en dégradé */}
      <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.heroRing, { width: 260, height: 260, top: -90, right: -80 }]} />
        <View style={[styles.heroRing, { width: 160, height: 160, bottom: -50, left: -40, opacity: 0.07 }]} />
        <View style={styles.heroTop}>
          <Logo size={30} textSize={22} light />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => router.push('/carte')} style={styles.heroButton} accessibilityLabel="Carte des boutiques">
              <Ionicons name="map-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={() => router.navigate('/favoris')} style={styles.heroButton} accessibilityLabel={`Favoris (${favCount})`}>
              <Ionicons name="heart-outline" size={20} color="#fff" />
              {favCount ? <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{favCount}</Text></View> : null}
            </Pressable>
            <Pressable onPress={() => router.navigate('/paniers')} style={styles.heroButton} accessibilityLabel={`Panier (${cartCount})`}>
              <Ionicons name="bag-handle-outline" size={20} color="#fff" />
              {cartCount ? <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{cartCount}</Text></View> : null}
            </Pressable>
          </View>
        </View>
        <Text style={styles.helloTitle}>{firstName ? `Bonjour ${firstName} 👋` : 'Bienvenue 👋'}</Text>
        <Text style={styles.helloSub}>Qu’allez-vous découvrir aujourd’hui ?</Text>
      </LinearGradient>

      <PressScale onPress={() => explore({ focus: '1' })} style={styles.search} accessibilityRole="search" scaleTo={0.985}>
        <View style={styles.searchIcon}><Ionicons name="search" size={18} color="#fff" /></View>
        <Text style={styles.searchText} numberOfLines={1}>Rechercher un produit, une boutique</Text>
        <Ionicons name="options-outline" size={20} color={COLORS.muted} />
      </PressScale>

      <View style={{ marginTop: 18 }}><PromoCarousel /></View>

      {status === 'loading' ? <HomeSkeleton cardWidth={cardWidth} /> : null}

      {status === 'error' ? (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.faint} />
          <Text style={styles.errorTitle}>Boutiques indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => { setStatus('loading'); load(); }} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable>
        </View>
      ) : null}

      {status === 'ready' ? (
        <>
          {categories.length ? (
            <>
              <SectionHeader title="Catégories" icon="grid" action="Tout voir" onAction={() => explore()} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                {categories.map(([name, count], i) => {
                  const tone = SOFT[i % SOFT.length];
                  return (
                    <FadeIn key={name} delay={i * 60}>
                      <PressScale onPress={() => explore({ categorie: name })} style={styles.category}>
                        <View style={[styles.categoryIcon, { backgroundColor: tone.bg }]}><Ionicons name={categoryIcon(name)} size={26} color={tone.fg} /></View>
                        <Text style={styles.categoryText} numberOfLines={1}>{name}</Text>
                        <Text style={styles.categoryCount}>{count} article{count > 1 ? 's' : ''}</Text>
                      </PressScale>
                    </FadeIn>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {/* Carte des boutiques */}
          <PressScale onPress={() => router.push('/carte')} style={styles.mapCard} scaleTo={0.98}>
            <LinearGradient colors={GRADIENTS.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mapFill}>
              <View style={[styles.mapRoad, { top: 30, transform: [{ rotate: '-12deg' }] }]} />
              <View style={[styles.mapRoad, { top: 88, transform: [{ rotate: '8deg' }] }]} />
              <View style={[styles.mapRoadV, { right: 110, transform: [{ rotate: '14deg' }] }]} />
              {[[44, 210], [96, 150], [60, 90], [120, 250]].map(([top, right]) => (
                <View key={`${top}-${right}`} style={[styles.mapPin, { top, right }]}><Ionicons name="storefront" size={13} color={COLORS.brand} /></View>
              ))}
              <View style={{ flex: 1 }}>
                <Text style={styles.mapKicker}>CARTE DES BOUTIQUES</Text>
                <Text style={styles.mapTitle}>Les boutiques près de chez vous</Text>
                <View style={styles.mapButton}><Ionicons name="navigate" size={14} color={COLORS.ink} /><Text style={styles.mapButtonText}>Ouvrir la carte</Text></View>
              </View>
            </LinearGradient>
          </PressScale>

          {featured.length ? (
            <>
              <SectionHeader title={shops.some((s) => s.featured) ? 'À la une' : 'Boutiques populaires'} icon="flame" colors={GRADIENTS.sunset} action="Explorer" onAction={() => explore({ vue: 'boutiques' })} />
              <FlatList
                data={featured}
                horizontal
                keyExtractor={(s) => s.shop_name}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP, paddingBottom: 10 }}
                snapToInterval={Math.min(300, width - 60) + GAP}
                decelerationRate="fast"
                renderItem={({ item, index }) => (
                  <FadeIn delay={index * 80}><FeaturedShopCard shop={item} width={Math.min(300, width - 60)} onPress={() => openShop(item)} /></FadeIn>
                )}
              />
            </>
          ) : null}

          {latest.length ? (
            <>
              <SectionHeader title="Nouveautés" icon="sparkles" colors={GRADIENTS.rose} action="Tout voir" onAction={() => explore()} />
              <View style={styles.grid}>
                {latest.map((p, i) => (
                  <FadeIn key={p.id} delay={Math.min(i, 5) * 70}>
                    <ProductCard product={p} width={cardWidth} shopName={p.shop?.shop_name} onPress={() => openProduct(p)} />
                  </FadeIn>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title={`Toutes les boutiques · ${shops.length}`} icon="storefront" colors={GRADIENTS.teal} action="Carte" onAction={() => router.push('/carte')} />
          <View style={{ paddingHorizontal: SIDE }}>
            {shops.length ? shops.map((s, i) => <FadeIn key={s.shop_name} delay={Math.min(i, 4) * 70}><ShopCard shop={s} onPress={() => openShop(s)} /></FadeIn>) : (
              <View style={styles.errorBox}>
                <Ionicons name="storefront-outline" size={40} color={COLORS.faint} />
                <Text style={styles.errorTitle}>Bientôt des boutiques ici</Text>
              </View>
            )}
          </View>
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </>
      ) : null}

      <Text style={styles.version}>Version de test 0.9 · carte et décors</Text>
    </ScrollView>
  );
}

// Premier lancement : pages de bienvenue avant l'accueil.
export default function HomeGate() {
  const [onboarded] = useState(() => Boolean(store.get('onboarded', false)));
  if (!onboarded) return <Redirect href="/bienvenue" />;
  return <Home />;
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingHorizontal: SIDE, paddingBottom: 46, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  heroRing: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.1 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#3b2fc9' },
  heroBadgeText: { color: COLORS.ink, fontSize: 10, fontWeight: '800' },
  helloTitle: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 22 },
  helloSub: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 4 },
  search: {
    marginHorizontal: SIDE, marginTop: -28, flexDirection: 'row', alignItems: 'center', gap: 12, height: 58,
    backgroundColor: COLORS.card, borderRadius: 20, paddingLeft: 8, paddingRight: 16, ...SHADOW, shadowOpacity: 0.12, shadowRadius: 18, elevation: 8,
  },
  searchIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  searchText: { flex: 1, color: COLORS.faint, fontSize: 15 },
  categories: { paddingHorizontal: SIDE, gap: 12 },
  category: { width: 82, alignItems: 'center', gap: 6 },
  categoryIcon: { width: 66, height: 66, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  categoryText: { color: COLORS.ink, fontSize: 12.5, fontWeight: '700' },
  categoryCount: { color: COLORS.faint, fontSize: 10.5, marginTop: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: SIDE },
  mapCard: { marginHorizontal: SIDE, marginTop: 26, borderRadius: 26, overflow: 'hidden', ...SHADOW, shadowColor: '#0e7c86', shadowOpacity: 0.25 },
  mapFill: { padding: 20, minHeight: 150, overflow: 'hidden' },
  mapRoad: { position: 'absolute', left: -20, right: -20, height: 10, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 5 },
  mapRoadV: { position: 'absolute', top: -20, bottom: -20, width: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 5 },
  mapPin: { position: 'absolute', width: 28, height: 28, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowOpacity: 0.2 },
  mapKicker: { color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  mapTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 5, maxWidth: 190, lineHeight: 25, letterSpacing: -0.4 },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, marginTop: 14 },
  mapButtonText: { color: COLORS.ink, fontSize: 13, fontWeight: '800' },
  errorBox: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  errorTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  errorText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  retry: { marginTop: 16, backgroundColor: COLORS.ink, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.md },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  inlineError: { color: COLORS.danger, fontSize: 12.5, textAlign: 'center', marginTop: 8 },
  version: { color: COLORS.faint, fontSize: 11.5, textAlign: 'center', marginTop: 20 },
});
