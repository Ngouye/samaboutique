// Accueil : en-tête nuit (avatar, salutation, cloche, recherche, catégories en pilules), bannière
// « Nouvelle collection », catégories illustrées par leurs produits, coup de cœur, nouveautés,
// récemment consultés, bons plans, carte, boutiques à la une, toutes les boutiques.
// Au tout premier lancement, les pages de bienvenue s'affichent d'abord.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import ShopCard from '../../src/components/ShopCard';
import FeaturedShopCard from '../../src/components/FeaturedShopCard';
import ProductCard from '../../src/components/ProductCard';
import PromoCarousel from '../../src/components/PromoCarousel';
import HeartButton from '../../src/components/HeartButton';
import Skeleton from '../../src/components/Skeleton';
import { Editorial, FadeIn, Glow, PressScale, SectionHeader } from '../../src/components/ui';
import { fetchCatalog, fetchShops } from '../../src/lib/shops';
import { rememberProduct } from '../../src/lib/shop';
import { categoryIcon } from '../../src/lib/categories';
import { store } from '../../src/lib/storage';
import { listRecent } from '../../src/lib/recent';
import { listOrders } from '../../src/lib/myOrders';
import { useFavorites } from '../../src/lib/favorites';
import { fmt, initials, ratingLabel, thumbUrl } from '../../src/lib/format';
import { COLORS, GRADIENTS, RADIUS, SHADOW, SOFT, TAB_SPACE, sheet } from '../../src/theme';

const SIDE = 16;
const GAP = 12;

// « Bonjour », « Bon après-midi », « Bonsoir » selon l'heure du téléphone.
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return ['Bonjour', 'sunny-outline'];
  if (h < 18) return ['Bon après-midi', 'partly-sunny-outline'];
  return ['Bonsoir', 'moon-outline'];
}

function HomeSkeleton({ cardWidth }) {
  return (
    <View style={{ paddingHorizontal: SIDE, marginTop: 22 }}>
      <Skeleton height={190} radius={26} />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={{ alignItems: 'center', gap: 6 }}><Skeleton width={76} height={76} radius={22} /><Skeleton width={52} height={10} /></View>)}
      </View>
      <View style={{ flexDirection: 'row', gap: GAP, marginTop: 24 }}>
        {[0, 1].map((i) => <Skeleton key={i} width={cardWidth} height={cardWidth * 1.25 + 70} radius={RADIUS.lg} />)}
      </View>
    </View>
  );
}

function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - SIDE * 2 - GAP) / 2);
  const favorites = useFavorites();

  const [shops, setShops] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState({ name: '', first: '' });
  const [recent, setRecent] = useState([]);
  const [ordersCount, setOrdersCount] = useState(0);

  // En-tête nuit : texte de la barre d'état en blanc.
  useFocusEffect(useCallback(() => {
    const name = String(store.get('client', {}).name || '').trim();
    setClient({ name, first: name.split(/\s+/)[0] || '' });
    setRecent(listRecent());
    setOrdersCount(listOrders().length);
    setStatusBarStyle('light');
    return () => setStatusBarStyle('light');
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

  // Catégories avec leur nombre d'articles et la photo d'un de leurs produits.
  const categories = useMemo(() => {
    const map = new Map();
    catalog.forEach((p) => {
      const c = p.category || 'Autres';
      const cur = map.get(c) || { name: c, count: 0, image: null };
      map.set(c, { ...cur, count: cur.count + 1, image: cur.image || p.image_url || null });
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [catalog]);
  const featuredShops = useMemo(() => {
    const top = shops.filter((s) => s.featured);
    return top.length ? top : shops;
  }, [shops]);
  const latest = useMemo(() => catalog.slice(0, 8), [catalog]);
  const withPhoto = useMemo(() => catalog.filter((p) => p.image_url), [catalog]);
  // Coup de cœur : le produit le mieux noté (sinon le plus récent avec une photo).
  const star = useMemo(() => {
    const rated = withPhoto.filter((p) => p.ratingInfo).sort((a, b) => (b.ratingInfo.average * Math.log2(b.ratingInfo.count + 1)) - (a.ratingInfo.average * Math.log2(a.ratingInfo.count + 1)));
    return rated[0] || withPhoto[0] || null;
  }, [withPhoto]);

  const openShop = useCallback((shop) => router.push({ pathname: '/boutique/[shop]', params: { shop: shop.shop_name } }), [router]);
  const openProduct = useCallback((product) => {
    rememberProduct(product, product.shop);
    router.push({ pathname: '/produit/[id]', params: { id: String(product.id), shop: product.shop?.shop_name || '' } });
  }, [router]);
  const explore = useCallback((params = {}) => router.navigate({ pathname: '/explorer', params }), [router]);
  const [hello, helloIcon] = greeting();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: TAB_SPACE + insets.bottom + 10 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.brand]} tintColor="#fff" progressViewOffset={insets.top} />}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête nuit : avatar, salutation, cloche, titre, recherche, catégories */}
      <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <Glow color={COLORS.brandVivid} size={340} opacity={0.55} style={{ top: -150, right: -120 }} />
        <Glow color={COLORS.gold} size={240} opacity={0.2} style={{ bottom: -130, left: -90 }} />
        {[0.25, 0.5, 0.75].map((x) => <View key={`v${x}`} style={[styles.gridV, { left: `${x * 100}%` }]} />)}

        <View style={styles.heroTop}>
          <Pressable onPress={() => router.push('/compte')} style={styles.me} accessibilityLabel="Mon espace">
            <LinearGradient colors={GRADIENTS.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              {client.name ? <Text style={styles.avatarText}>{initials(client.name)}</Text> : <Ionicons name="person" size={20} color={COLORS.ctaInk} />}
            </LinearGradient>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.hello} numberOfLines={1}>{client.first ? `Salut ${client.first} 👋` : 'Bienvenue 👋'}</Text>
              <View style={styles.helloSub}>
                <Ionicons name={helloIcon} size={13} color={COLORS.goldInk} />
                <Text style={styles.helloSubText}>{hello} · Sénégal</Text>
              </View>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => router.push('/carte')} style={styles.heroButton} accessibilityLabel="Carte des boutiques">
              <Ionicons name="map-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={() => router.navigate('/commandes')} style={styles.heroButton} accessibilityLabel={ordersCount ? `Suivi de mes commandes (${ordersCount})` : 'Suivi de mes commandes'}>
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {ordersCount ? <View style={styles.bellDot} /> : null}
            </Pressable>
          </View>
        </View>

        <Text style={styles.title}>Qu’allez-vous <Editorial>découvrir</Editorial>{'\n'}aujourd’hui ?</Text>

        <View style={styles.searchRow}>
          <PressScale onPress={() => explore({ focus: '1' })} style={styles.search} accessibilityRole="search" scaleTo={0.985}>
            <Ionicons name="search" size={19} color={COLORS.muted} />
            <Text style={styles.searchText} numberOfLines={1}>Rechercher un produit, une boutique…</Text>
          </PressScale>
          <PressScale onPress={() => explore({ filtres: '1' })} scaleTo={0.92} accessibilityLabel="Trier et filtrer">
            <LinearGradient colors={GRADIENTS.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.filterButton}>
              <Ionicons name="options" size={20} color={COLORS.ctaInk} />
            </LinearGradient>
          </PressScale>
        </View>

        {categories.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={{ marginHorizontal: -SIDE }}>
            <Pressable onPress={() => explore()} style={[styles.pill, styles.pillOn]}><Text style={[styles.pillText, styles.pillTextOn]}>Tout</Text></Pressable>
            {categories.map((c) => (
              <Pressable key={c.name} onPress={() => explore({ categorie: c.name })} style={styles.pill}>
                <Text style={styles.pillText}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </LinearGradient>

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
          {/* Bannière « Nouvelle collection » : gros titre, nombre d'articles, photos des derniers produits */}
          {withPhoto.length ? (
            <FadeIn>
              <PressScale onPress={() => explore()} style={styles.collection} scaleTo={0.98} accessibilityLabel="Découvrir la nouvelle collection">
                <LinearGradient colors={GRADIENTS.nightIndigo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.collectionFill}>
                  <Glow color={COLORS.gold} size={260} opacity={0.28} style={{ top: -120, left: -80 }} />
                  <Glow color={COLORS.brandVivid} size={240} opacity={0.5} style={{ bottom: -120, right: -60 }} />
                  <View style={styles.collectionCopy}>
                    <View style={styles.countPill}><Text style={styles.countText}>{catalog.length} articles</Text></View>
                    <Text style={styles.collectionTitle}><Editorial style={{ fontSize: 34 }}>Nouvelle</Editorial>{'\n'}collection</Text>
                    <Text style={styles.collectionText}>Les dernières pièces des boutiques près de chez vous.</Text>
                    <View style={styles.discover}><Text style={styles.discoverText}>Découvrir</Text><Ionicons name="arrow-forward" size={15} color={COLORS.ctaInk} /></View>
                  </View>
                  <View style={styles.collage} pointerEvents="none">
                    {withPhoto.slice(0, 3).map((p, i) => (
                      <View key={p.id} style={[styles.collagePhoto, [
                        { top: 6, right: 30, transform: [{ rotate: '7deg' }], zIndex: 1 },
                        { top: 66, right: 0, transform: [{ rotate: '-6deg' }], zIndex: 3 },
                        { top: 96, right: 54, transform: [{ rotate: '-12deg' }], zIndex: 2 },
                      ][i]]}>
                        <Image source={thumbUrl(p.image_url)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </PressScale>
            </FadeIn>
          ) : null}

          {/* Catégories illustrées par un de leurs produits */}
          {categories.length ? (
            <>
              <SectionHeader title="Catégories" action="Tout voir" onAction={() => explore()} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                {categories.map((c, i) => {
                  const tone = SOFT[i % SOFT.length];
                  return (
                    <FadeIn key={c.name} delay={i * 60}>
                      <PressScale onPress={() => explore({ categorie: c.name })} style={styles.category} accessibilityLabel={`${c.name}, ${c.count} articles`}>
                        <View style={[styles.categoryPhoto, { backgroundColor: tone.bg }]}>
                          {c.image ? <Image source={thumbUrl(c.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Ionicons name={categoryIcon(c.name)} size={28} color={tone.fg} />}
                          {c.image ? <View style={[styles.categoryBadge, { backgroundColor: tone.bg }]}><Ionicons name={categoryIcon(c.name)} size={12} color={tone.fg} /></View> : null}
                        </View>
                        <Text style={styles.categoryText} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.categoryCount}>{c.count} article{c.count > 1 ? 's' : ''}</Text>
                      </PressScale>
                    </FadeIn>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {/* Coup de cœur : grand produit mis en avant */}
          {star ? (
            <>
              <SectionHeader title="Coup de cœur" />
              <FadeIn>
                <PressScale onPress={() => openProduct(star)} style={styles.star} scaleTo={0.98} accessibilityLabel={`${star.name}, ${fmt(star.price_fcfa)} francs`}>
                  <View style={styles.starPhoto}>
                    <Image source={star.image_url} placeholder={thumbUrl(star.image_url)} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                    <LinearGradient colors={['transparent', 'rgba(7,6,26,0.55)']} style={styles.starShade} pointerEvents="none" />
                    {star.ratingInfo ? (
                      <View style={styles.starRating}><Ionicons name="star" size={12} color={COLORS.gold} /><Text style={styles.starRatingText}>{ratingLabel(star.ratingInfo.average)} · {star.ratingInfo.count} avis</Text></View>
                    ) : null}
                  </View>
                  {/* Coin découpé avec le cœur des favoris */}
                  <View style={styles.starNotch}>
                    <HeartButton active={favorites.isProduct(star.id)} onToggle={() => favorites.toggleProduct(star, star.shop)} size={40} />
                  </View>
                  <View style={styles.starInfo}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.starShop} numberOfLines={1}>{star.shop?.shop_name || star.category || ''}</Text>
                      <Text style={styles.starName} numberOfLines={1}>{star.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.starPriceLabel}>Prix</Text>
                      <Text style={styles.starPrice}>{fmt(star.price_fcfa)}<Text style={styles.starCurrency}> F</Text></Text>
                    </View>
                  </View>
                </PressScale>
              </FadeIn>
            </>
          ) : null}

          {latest.length ? (
            <>
              <SectionHeader title="Nouveautés" action="Tout voir" onAction={() => explore()} />
              <View style={styles.grid}>
                {latest.map((p, i) => (
                  <FadeIn key={p.id} delay={Math.min(i, 5) * 70}>
                    <ProductCard product={p} rating={p.ratingInfo} width={cardWidth} shopName={p.shop?.shop_name} onPress={() => openProduct(p)} />
                  </FadeIn>
                ))}
              </View>
            </>
          ) : null}

          {/* Produits récemment consultés sur ce téléphone */}
          {recent.length ? (
            <>
              <SectionHeader title="Récemment consultés" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SIDE, gap: 10 }}>
                {recent.map((p, i) => (
                  <FadeIn key={p.id} delay={Math.min(i, 5) * 50}>
                    <PressScale onPress={() => openProduct(p)} style={styles.recent} scaleTo={0.96} accessibilityLabel={p.name}>
                      <View style={styles.recentPhoto}>
                        {p.image_url ? <Image source={thumbUrl(p.image_url)} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Ionicons name="image-outline" size={22} color={COLORS.faint} />}
                      </View>
                      <Text style={styles.recentName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.recentPrice}>{fmt(p.price_fcfa)} F</Text>
                    </PressScale>
                  </FadeIn>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Bons à savoir : acompte, paiement mobile, suivi */}
          <SectionHeader title="Bon à savoir" />
          <PromoCarousel />

          {/* Carte des boutiques */}
          <PressScale onPress={() => router.push('/carte')} style={styles.mapCard} scaleTo={0.98}>
            <LinearGradient colors={GRADIENTS.nightIndigo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mapFill}>
              <Glow color={COLORS.brandVivid} size={260} opacity={0.5} style={{ top: -110, right: -70 }} />
              <View style={[styles.mapRoad, { top: 30, transform: [{ rotate: '-12deg' }] }]} />
              <View style={[styles.mapRoad, { top: 88, transform: [{ rotate: '8deg' }] }]} />
              <View style={[styles.mapRoadV, { right: 110, transform: [{ rotate: '14deg' }] }]} />
              {[[22, 30], [70, 92], [116, 34], [118, 122]].map(([top, right]) => (
                <View key={`${top}-${right}`} style={[styles.mapPin, { top, right }]}><Ionicons name="storefront" size={13} color={COLORS.goldInk} /></View>
              ))}
              <View style={{ flex: 1 }}>
                <Text style={styles.mapKicker}>CARTE DES BOUTIQUES</Text>
                <Text style={styles.mapTitle}>Les boutiques <Editorial>près de chez vous</Editorial></Text>
                <View style={styles.mapButton}><Ionicons name="navigate" size={14} color={COLORS.ctaInk} /><Text style={styles.mapButtonText}>Ouvrir la carte</Text></View>
              </View>
            </LinearGradient>
          </PressScale>

          {featuredShops.length ? (
            <>
              <SectionHeader title={shops.some((s) => s.featured) ? 'Boutiques à la une' : 'Boutiques populaires'} action="Explorer" onAction={() => explore({ vue: 'boutiques' })} />
              <FlatList
                data={featuredShops}
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

          <SectionHeader title={`Toutes les boutiques · ${shops.length}`} action="Carte" onAction={() => router.push('/carte')} />
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

      <Text style={styles.version}>Version de test 1.0</Text>
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
  hero: {
    paddingHorizontal: SIDE, paddingBottom: 18, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden',
    borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(255,255,255,0.07)',
  },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(174,166,247,0.06)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  avatarText: { color: COLORS.ctaInk, fontSize: 16, fontWeight: '800' },
  hello: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  helloSub: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  helloSubText: { color: 'rgba(255,255,255,0.62)', fontSize: 12.5, fontWeight: '600' },
  heroButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.gold, borderWidth: 2, borderColor: '#151140' },
  title: { color: '#fff', fontSize: 29, fontWeight: '800', letterSpacing: -0.9, lineHeight: 35, marginTop: 22 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  search: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  searchText: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 14.5 },
  filterButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  pills: { gap: 8, paddingHorizontal: SIDE, paddingTop: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pillOn: { backgroundColor: COLORS.cta, borderColor: COLORS.cta },
  pillText: { color: 'rgba(255,255,255,0.82)', fontSize: 13.5, fontWeight: '700' },
  pillTextOn: { color: COLORS.ctaInk, fontWeight: '800' },
  // Nouvelle collection
  collection: { marginHorizontal: SIDE, marginTop: 20, borderRadius: 28, overflow: 'hidden', ...SHADOW },
  collectionFill: { minHeight: 200, padding: 20, overflow: 'hidden' },
  collectionCopy: { width: '54%', zIndex: 5 },
  countPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  countText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  collectionTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1.2, lineHeight: 34, marginTop: 10 },
  collectionText: { color: 'rgba(255,255,255,0.66)', fontSize: 12.5, lineHeight: 17, marginTop: 6 },
  discover: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.cta },
  discoverText: { color: COLORS.ctaInk, fontSize: 14, fontWeight: '800' },
  collage: { position: 'absolute', top: 14, right: 14, bottom: 14, width: '44%' },
  collagePhoto: {
    position: 'absolute', width: 86, height: 104, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  // Catégories illustrées
  categories: { paddingHorizontal: SIDE, gap: 12 },
  category: { width: 84, alignItems: 'center', gap: 6 },
  categoryPhoto: { width: 80, height: 80, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryBadge: { position: 'absolute', right: 5, bottom: 5, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  categoryText: { color: COLORS.ink, fontSize: 12.5, fontWeight: '700' },
  categoryCount: { color: COLORS.faint, fontSize: 10.5, marginTop: -4 },
  // Coup de cœur
  star: { marginHorizontal: SIDE, borderRadius: 28, backgroundColor: COLORS.card, padding: 8, ...SHADOW },
  starPhoto: { height: 220, borderRadius: 22, overflow: 'hidden', backgroundColor: COLORS.raised },
  starShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  starRating: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(10,8,32,0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  starRatingText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  starNotch: { position: 'absolute', top: 0, right: 0, padding: 8, paddingLeft: 10, paddingBottom: 10, backgroundColor: COLORS.card, borderBottomLeftRadius: 24 },
  starInfo: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 6 },
  starShop: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  starName: { color: COLORS.ink, fontSize: 18, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },
  starPriceLabel: { color: COLORS.faint, fontSize: 11.5, fontWeight: '700' },
  starPrice: { color: COLORS.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  starCurrency: { fontSize: 14, color: COLORS.goldInk },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: SIDE },
  recent: { width: 112 },
  recentPhoto: { width: 112, height: 112, borderRadius: 18, overflow: 'hidden', backgroundColor: COLORS.raised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line },
  recentName: { color: COLORS.ink, fontSize: 12.5, fontWeight: '700', marginTop: 6 },
  recentPrice: { color: COLORS.goldInk, fontSize: 12.5, fontWeight: '800', marginTop: 1 },
  mapCard: { marginHorizontal: SIDE, marginTop: 26, borderRadius: 26, overflow: 'hidden', ...SHADOW },
  mapFill: { padding: 20, minHeight: 150, overflow: 'hidden' },
  mapRoad: { position: 'absolute', left: -20, right: -20, height: 8, backgroundColor: 'rgba(174,166,247,0.1)', borderRadius: 4 },
  mapRoadV: { position: 'absolute', top: -20, bottom: -20, width: 8, backgroundColor: 'rgba(174,166,247,0.08)', borderRadius: 4 },
  mapPin: { position: 'absolute', width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(10,8,32,0.75)', borderWidth: 1, borderColor: 'rgba(246,199,104,0.5)', alignItems: 'center', justifyContent: 'center' },
  mapKicker: { color: COLORS.goldInk, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4 },
  mapTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 5, maxWidth: 190, lineHeight: 25, letterSpacing: -0.4 },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: COLORS.cta, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, marginTop: 14 },
  mapButtonText: { color: COLORS.ctaInk, fontSize: 13, fontWeight: '800' },
  errorBox: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  errorTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  errorText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  retry: { marginTop: 16, backgroundColor: COLORS.cta, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.md },
  retryText: { color: COLORS.ctaInk, fontWeight: '800', fontSize: 15 },
  inlineError: { color: COLORS.danger, fontSize: 12.5, textAlign: 'center', marginTop: 8 },
  version: { color: COLORS.faint, fontSize: 11.5, textAlign: 'center', marginTop: 20 },
});
