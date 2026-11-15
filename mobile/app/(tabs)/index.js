// Accueil : bienvenue, recherche, catégories, boutiques à la une, nouveautés de toutes les boutiques, toutes les boutiques.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Logo from '../../src/components/Logo';
import ShopCard from '../../src/components/ShopCard';
import FeaturedShopCard from '../../src/components/FeaturedShopCard';
import ProductCard from '../../src/components/ProductCard';
import Skeleton from '../../src/components/Skeleton';
import { fetchCatalog, fetchShops } from '../../src/lib/shops';
import { rememberProduct } from '../../src/lib/shop';
import { categoryIcon } from '../../src/lib/categories';
import { store } from '../../src/lib/storage';
import { COLORS, RADIUS, SHADOW, sheet } from '../../src/theme';

const SIDE = 16;
const GAP = 12;

function SectionTitle({ title, action, onAction }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="arrow-forward" size={15} color={COLORS.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}

function HomeSkeleton({ cardWidth }) {
  return (
    <View style={{ paddingHorizontal: SIDE }}>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={{ alignItems: 'center', gap: 6 }}><Skeleton width={58} height={58} radius={20} /><Skeleton width={50} height={10} /></View>)}
      </View>
      <Skeleton height={20} width={160} style={{ marginTop: 26 }} />
      <Skeleton height={210} radius={RADIUS.lg} style={{ marginTop: 12 }} />
      <Skeleton height={20} width={130} style={{ marginTop: 26 }} />
      <View style={{ flexDirection: 'row', gap: GAP, marginTop: 12 }}>
        {[0, 1].map((i) => <Skeleton key={i} width={cardWidth} height={cardWidth + 80} radius={RADIUS.md} />)}
      </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - SIDE * 2 - GAP) / 2);

  const [shops, setShops] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState('');

  useFocusEffect(useCallback(() => {
    setFirstName(String(store.get('client', {}).name || '').trim().split(/\s+/)[0] || '');
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
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name);
  }, [catalog]);
  const featured = useMemo(() => {
    const top = shops.filter((s) => s.featured);
    return top.length ? top : shops;
  }, [shops]);
  const latest = useMemo(() => catalog.slice(0, 6), [catalog]);

  const openShop = useCallback((shop) => router.push({ pathname: '/boutique/[shop]', params: { shop: shop.shop_name } }), [router]);
  const openProduct = useCallback((product) => {
    rememberProduct(product, product.shop);
    router.push({ pathname: '/produit/[id]', params: { id: String(product.id), shop: product.shop?.shop_name || '' } });
  }, [router]);
  const explore = useCallback((params = {}) => router.navigate({ pathname: '/explorer', params }), [router]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor={COLORS.brand} />}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <View style={styles.top}>
        <Logo size={36} textSize={23} />
      </View>
      <View style={styles.hello}>
        <Text style={styles.helloTitle}>{firstName ? `Bonjour ${firstName} 👋` : 'Bienvenue 👋'}</Text>
        <Text style={styles.helloSub}>Les boutiques du Sénégal, livrées chez vous</Text>
      </View>

      <Pressable onPress={() => explore({ focus: '1' })} style={styles.search} accessibilityRole="search">
        <Ionicons name="search" size={19} color={COLORS.muted} />
        <Text style={styles.searchText}>Rechercher un produit, une boutique…</Text>
      </Pressable>

      {/* Bandeau : paiement à la livraison avec acompte */}
      <View style={styles.banner}>
        <View style={[styles.bubble, { right: -30, top: -40, width: 140, height: 140 }]} />
        <View style={[styles.bubble, { right: 60, bottom: -50, width: 100, height: 100, opacity: 0.08 }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerKicker}>PAIEMENT À LA LIVRAISON</Text>
          <Text style={styles.bannerTitle}>Un acompte de 10 % suffit</Text>
          <Text style={styles.bannerText}>Payez le reste au livreur, à la réception de votre colis.</Text>
        </View>
        <View style={styles.bannerIcon}><Ionicons name="shield-checkmark" size={28} color={COLORS.brand} /></View>
      </View>

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
              <SectionTitle title="Catégories" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                {categories.map((c) => (
                  <Pressable key={c} onPress={() => explore({ categorie: c })} style={styles.category}>
                    <View style={styles.categoryIcon}><Ionicons name={categoryIcon(c)} size={24} color={COLORS.brand} /></View>
                    <Text style={styles.categoryText} numberOfLines={1}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {featured.length ? (
            <>
              <SectionTitle title={shops.some((s) => s.featured) ? 'À la une' : 'Boutiques'} />
              <FlatList
                data={featured}
                horizontal
                keyExtractor={(s) => s.shop_name}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP, paddingBottom: 6 }}
                snapToInterval={Math.min(300, width - 60) + GAP}
                decelerationRate="fast"
                renderItem={({ item }) => <FeaturedShopCard shop={item} width={Math.min(300, width - 60)} onPress={() => openShop(item)} />}
              />
            </>
          ) : null}

          {latest.length ? (
            <>
              <SectionTitle title="Nouveautés" action="Tout voir" onAction={() => explore()} />
              <View style={styles.grid}>
                {latest.map((p) => (
                  <ProductCard key={p.id} product={p} width={cardWidth} shopName={p.shop?.shop_name} onPress={() => openProduct(p)} />
                ))}
              </View>
            </>
          ) : null}

          <SectionTitle title={`Toutes les boutiques · ${shops.length}`} />
          <View style={{ paddingHorizontal: SIDE }}>
            {shops.length ? shops.map((s) => <ShopCard key={s.shop_name} shop={s} onPress={() => openShop(s)} />) : (
              <View style={styles.errorBox}>
                <Ionicons name="storefront-outline" size={40} color={COLORS.faint} />
                <Text style={styles.errorTitle}>Bientôt des boutiques ici</Text>
              </View>
            )}
          </View>
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </>
      ) : null}

      <Text style={styles.version}>Version de test 0.6 · nouveau design</Text>
    </ScrollView>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  top: { paddingHorizontal: SIDE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { paddingHorizontal: SIDE, marginTop: 16 },
  helloTitle: { color: COLORS.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  helloSub: { color: COLORS.muted, fontSize: 14, marginTop: 2 },
  search: {
    marginHorizontal: SIDE, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.line,
  },
  searchText: { color: COLORS.faint, fontSize: 15 },
  banner: {
    marginHorizontal: SIDE, marginTop: 16, borderRadius: RADIUS.lg, backgroundColor: COLORS.brand, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden', ...SHADOW, shadowColor: COLORS.brand, shadowOpacity: 0.25,
  },
  bubble: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.1 },
  bannerKicker: { color: '#cfcbfb', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  bannerTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },
  bannerText: { color: '#e6e4fd', fontSize: 13, lineHeight: 18, marginTop: 4 },
  bannerIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIDE, marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { color: COLORS.brand, fontSize: 14, fontWeight: '700' },
  categories: { paddingHorizontal: SIDE, gap: 14 },
  category: { width: 70, alignItems: 'center', gap: 7 },
  categoryIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line },
  categoryText: { color: COLORS.ink, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: SIDE },
  errorBox: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  errorTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  errorText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  retry: { marginTop: 16, backgroundColor: COLORS.ink, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.md },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  inlineError: { color: COLORS.danger, fontSize: 12.5, textAlign: 'center', marginTop: 8 },
  version: { color: COLORS.faint, fontSize: 11.5, textAlign: 'center', marginTop: 18 },
});
