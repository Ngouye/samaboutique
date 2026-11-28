// Favoris : produits et boutiques mis de côté. Les produits sont remis à jour (prix, stock) avec le catalogue.
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProductCard from '../../src/components/ProductCard';
import ShopCard from '../../src/components/ShopCard';
import { HEART_RED } from '../../src/components/HeartButton';
import { useFavorites } from '../../src/lib/favorites';
import { fetchCatalog, fetchShops } from '../../src/lib/shops';
import { rememberProduct } from '../../src/lib/shop';
import { COLORS, RADIUS, sheet, TAB_SPACE } from '../../src/theme';

const SIDE = 16;
const GAP = 12;

export default function Favorites() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - SIDE * 2 - GAP) / 2);
  const favorites = useFavorites();
  const [tab, setTab] = useState('products');
  const [fresh, setFresh] = useState({ products: new Map(), shops: new Map() });

  // Données à jour des favoris (prix, stock, note) quand le catalogue est disponible.
  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchShops().then(async (shops) => {
      const catalog = await fetchCatalog(shops).catch(() => []);
      if (alive) setFresh({ products: new Map(catalog.map((p) => [String(p.id), p])), shops: new Map(shops.map((s) => [s.shop_name, s])) });
    }).catch(() => {});
    return () => { alive = false; };
  }, []));

  const products = useMemo(() => favorites.products().map((p) => fresh.products.get(String(p.id)) || p), [favorites, fresh]);
  const shops = useMemo(() => favorites.shops().map((s) => fresh.shops.get(s.shop_name) || s), [favorites, fresh]);

  const openProduct = useCallback((p) => {
    rememberProduct(p, p.shop);
    router.push({ pathname: '/produit/[id]', params: { id: String(p.id), shop: p.shop?.shop_name || '' } });
  }, [router]);
  const openShop = useCallback((s) => router.push({ pathname: '/boutique/[shop]', params: { shop: s.shop_name } }), [router]);

  const header = (
    <View>
      <Text style={styles.title}>Favoris</Text>
      <Text style={styles.subtitle}>Vos coups de cœur, gardés sur ce téléphone</Text>
      <View style={styles.segment}>
        {[['products', `Produits · ${products.length}`], ['shops', `Boutiques · ${shops.length}`]].map(([id, label]) => (
          <Pressable key={id} onPress={() => setTab(id)} style={[styles.segmentItem, tab === id && styles.segmentOn]}>
            <Text style={[styles.segmentText, tab === id && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name="heart" size={34} color={HEART_RED} /></View>
      <Text style={styles.emptyTitle}>{tab === 'products' ? 'Aucun produit en favori' : 'Aucune boutique en favori'}</Text>
      <Text style={styles.emptyText}>Touchez le cœur sur {tab === 'products' ? 'un produit' : 'la page d’une boutique'} pour le retrouver ici.</Text>
      <Pressable onPress={() => router.navigate('/')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Découvrir les boutiques</Text></Pressable>
    </View>
  );

  return tab === 'products' ? (
    <FlatList
      key="favoris-produits"
      style={styles.screen}
      data={products}
      keyExtractor={(p) => String(p.id)}
      numColumns={2}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      contentContainerStyle={{ paddingHorizontal: SIDE, paddingTop: insets.top + 10, paddingBottom: TAB_SPACE + insets.bottom, flexGrow: 1 }}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item }) => <ProductCard product={item} width={cardWidth} shopName={item.shop?.shop_name} onPress={() => openProduct(item)} />}
    />
  ) : (
    <FlatList
      key="favoris-boutiques"
      style={styles.screen}
      data={shops}
      keyExtractor={(s) => s.shop_name}
      contentContainerStyle={{ paddingHorizontal: SIDE, paddingTop: insets.top + 10, paddingBottom: TAB_SPACE + insets.bottom, flexGrow: 1 }}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item }) => <ShopCard shop={item} onPress={() => openShop(item)} />}
    />
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { color: COLORS.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 2 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 4, marginTop: 14, marginBottom: 14 },
  segmentItem: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: COLORS.raised, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  segmentText: { color: COLORS.muted, fontSize: 13.5, fontWeight: '700' },
  segmentTextOn: { color: COLORS.ink, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 86, height: 86, borderRadius: 30, backgroundColor: 'rgba(244,63,94,0.14)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  emptyText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  emptyButton: { marginTop: 20, backgroundColor: COLORS.cta, paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.md },
  emptyButtonText: { color: COLORS.ctaInk, fontWeight: '800', fontSize: 15 },
});
