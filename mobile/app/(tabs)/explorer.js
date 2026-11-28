// Explorer : recherche dans tous les produits et toutes les boutiques, filtre par catégorie,
// tri (nouveautés, prix, mieux notés) et filtres (prix, en stock).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProductCard from '../../src/components/ProductCard';
import ShopCard from '../../src/components/ShopCard';
import Skeleton from '../../src/components/Skeleton';
import FilterSheet from '../../src/components/FilterSheet';
import LayoutToggle from '../../src/components/LayoutToggle';
import { useProductLayout } from '../../src/lib/layout';
import { DEFAULT_REFINE, PRICES, SORTS, fetchCatalog, fetchShops, filterProducts, filterShops, refineCount, refineProducts } from '../../src/lib/shops';
import { rememberProduct } from '../../src/lib/shop';
import { categoryIcon } from '../../src/lib/categories';
import { COLORS, RADIUS, sheet, TAB_SPACE } from '../../src/theme';

const SIDE = 16;
const GAP = 12;

export default function Explorer() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - SIDE * 2 - GAP) / 2);
  const input = useRef(null);

  const [shops, setShops] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [tab, setTab] = useState('products'); // products | shops
  const [refine, setRefine] = useState(DEFAULT_REFINE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useProductLayout();
  const listWidth = width - SIDE * 2;

  const load = useCallback(async (refresh = false) => {
    try {
      const list = await fetchShops();
      setShops(list);
      setCatalog(await fetchCatalog(list, { refresh }));
    } catch { /* l'écran affiche ce qui est déjà chargé */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Arrivée depuis l'accueil : catégorie choisie, ou recherche à taper tout de suite.
  useEffect(() => {
    if (params.categorie) { setCategory(String(params.categorie)); setTab('products'); }
    if (params.vue === 'boutiques') setTab('shops');
    if (params.focus) setTimeout(() => input.current?.focus(), 250);
    if (params.filtres) { setTab('products'); setFiltersOpen(true); }
  }, [params.categorie, params.focus, params.vue, params.filtres]);

  const categories = useMemo(() => {
    const counts = new Map();
    catalog.forEach((p) => { const c = p.category || 'Autres'; counts.set(c, (counts.get(c) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [catalog]);
  const matching = useMemo(() => filterProducts(catalog, { query, category }), [catalog, query, category]);
  const products = useMemo(() => refineProducts(matching, refine), [matching, refine]);
  const activeCount = refineCount(refine);
  const shopResults = useMemo(() => filterShops(shops, { query, category }), [shops, query, category]);

  const openProduct = useCallback((p) => {
    rememberProduct(p, p.shop);
    router.push({ pathname: '/produit/[id]', params: { id: String(p.id), shop: p.shop?.shop_name || '' } });
  }, [router]);
  const openShop = useCallback((s) => router.push({ pathname: '/boutique/[shop]', params: { shop: s.shop_name } }), [router]);
  const refresh = useCallback(async () => { setRefreshing(true); await load(true); setRefreshing(false); }, [load]);

  const header = (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Explorer</Text>
        <Pressable onPress={() => router.push('/carte')} style={styles.mapButton} accessibilityLabel="Carte des boutiques">
          <Ionicons name="map" size={16} color="#fff" />
          <Text style={styles.mapButtonText}>Carte</Text>
        </Pressable>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={19} color={COLORS.muted} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un produit, une boutique…"
          placeholderTextColor={COLORS.faint}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Effacer"><Ionicons name="close-circle" size={19} color={COLORS.faint} /></Pressable> : null}
        <Pressable onPress={() => { setTab('products'); setFiltersOpen(true); }} style={styles.searchFilter} accessibilityLabel={`Trier et filtrer${activeCount ? `, ${activeCount} actif${activeCount > 1 ? 's' : ''}` : ''}`} hitSlop={6}>
          <Ionicons name="options" size={18} color={COLORS.ctaInk} />
          {activeCount ? <View style={styles.searchFilterBadge}><Text style={styles.filterBadgeText}>{activeCount}</Text></View> : null}
        </Pressable>
      </View>

      <View style={styles.segment}>
        {[['products', `Produits · ${products.length}`], ['shops', `Boutiques · ${shopResults.length}`]].map(([id, label]) => (
          <Pressable key={id} onPress={() => setTab(id)} style={[styles.segmentItem, tab === id && styles.segmentOn]}>
            <Text style={[styles.segmentText, tab === id && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'products' ? (
        <View style={styles.refineRow}>
          <Text style={styles.resultCount}>{products.length} article{products.length > 1 ? 's' : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
            {refine.sort !== 'recent' ? <Pressable onPress={() => setRefine((r) => ({ ...r, sort: 'recent' }))} style={styles.activeChip}><Text style={styles.activeText}>{SORTS.find(([id]) => id === refine.sort)?.[1]}</Text><Ionicons name="close" size={13} color={COLORS.ink} /></Pressable> : null}
            {refine.price !== 'all' ? <Pressable onPress={() => setRefine((r) => ({ ...r, price: 'all' }))} style={styles.activeChip}><Text style={styles.activeText}>{PRICES.find(([id]) => id === refine.price)?.[1]}</Text><Ionicons name="close" size={13} color={COLORS.ink} /></Pressable> : null}
            {refine.inStock ? <Pressable onPress={() => setRefine((r) => ({ ...r, inStock: false }))} style={styles.activeChip}><Text style={styles.activeText}>En stock</Text><Ionicons name="close" size={13} color={COLORS.ink} /></Pressable> : null}
          </ScrollView>
          <LayoutToggle value={layout} onChange={setLayout} />
        </View>
      ) : null}

      {categories.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[null, ...categories].map((c) => {
            const on = category === c;
            return (
              <Pressable key={c || 'all'} onPress={() => setCategory(c)} style={[styles.chip, on && styles.chipOn]}>
                {c ? <Ionicons name={categoryIcon(c)} size={15} color={on ? '#fff' : COLORS.brand} /> : null}
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c || 'Tout'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  const empty = loading ? (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} width={cardWidth} height={cardWidth + 80} radius={RADIUS.md} style={{ marginBottom: GAP }} />)}
    </View>
  ) : (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name="search" size={30} color={COLORS.brand} /></View>
      <Text style={styles.emptyTitle}>Aucun résultat{query ? ` pour « ${query} »` : ''}</Text>
      <Text style={styles.emptyText}>{activeCount && tab === 'products' ? 'Essayez d’élargir les filtres.' : 'Essayez un autre mot ou une autre catégorie.'}</Text>
      {activeCount && tab === 'products' ? <Pressable onPress={() => setRefine(DEFAULT_REFINE)} style={styles.resetButton}><Text style={styles.resetText}>Réinitialiser les filtres</Text></Pressable> : null}
    </View>
  );

  const filterSheet = <FilterSheet visible={filtersOpen} value={refine} products={matching} onApply={setRefine} onClose={() => setFiltersOpen(false)} />;

  return tab === 'products' ? (
    <>
    <FlatList
      key={`produits-${layout}`}
      style={styles.screen}
      data={loading ? [] : products}
      keyExtractor={(p) => String(p.id)}
      numColumns={layout === 'list' ? 1 : 2}
      {...(layout === 'list' ? {} : { columnWrapperStyle: { justifyContent: 'space-between' } })}
      contentContainerStyle={{ paddingHorizontal: SIDE, paddingTop: insets.top + 10, paddingBottom: TAB_SPACE + insets.bottom }}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item }) => <ProductCard product={item} rating={item.ratingInfo} layout={layout} width={layout === 'list' ? listWidth : cardWidth} shopName={item.shop?.shop_name} onPress={() => openProduct(item)} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor={COLORS.brand} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
    {filterSheet}
    </>
  ) : (
    <FlatList
      key="boutiques"
      style={styles.screen}
      data={loading ? [] : shopResults}
      keyExtractor={(s) => s.shop_name}
      contentContainerStyle={{ paddingHorizontal: SIDE, paddingTop: insets.top + 10, paddingBottom: TAB_SPACE + insets.bottom }}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item }) => <ShopCard shop={item} onPress={() => openShop(item)} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor={COLORS.brand} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { color: COLORS.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.brand, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  mapButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, backgroundColor: COLORS.card, borderRadius: 999, paddingLeft: 18, paddingRight: 6, borderWidth: 1, borderColor: COLORS.line },
  searchFilter: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.cta, alignItems: 'center', justifyContent: 'center' },
  searchFilterBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.brandVivid, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: COLORS.bg },
  resultCount: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  searchInput: { flex: 1, color: COLORS.ink, fontSize: 15 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 4, marginTop: 14 },
  segmentItem: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: COLORS.raised, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  segmentText: { color: COLORS.muted, fontSize: 13.5, fontWeight: '700' },
  segmentTextOn: { color: COLORS.ink, fontWeight: '800' },
  chips: { gap: 8, paddingVertical: 14 },
  refineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.brandSoft, borderWidth: 1, borderColor: 'rgba(138,124,241,0.4)' },
  activeText: { color: COLORS.ink, fontSize: 12.5, fontWeight: '700' },
  resetButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 11, borderRadius: RADIUS.md, backgroundColor: COLORS.cta },
  resetText: { color: COLORS.ctaInk, fontSize: 14, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  chipOn: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginTop: 14, textAlign: 'center' },
  emptyText: { color: COLORS.muted, fontSize: 14, marginTop: 6, textAlign: 'center' },
});
