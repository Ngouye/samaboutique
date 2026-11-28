// Carte d'un produit, style « nuit de Dakar ».
//  - grille (par défaut) : grande photo au format portrait, badges en verre, cœur, nombre de photos,
//    bouton d'ajout doré posé sur la photo ; dessous : boutique, nom, note, couleurs, prix ;
//  - liste : photo à gauche, détails à droite (plus d'informations d'un coup d'œil).
// Ajout rapide : directement au panier si le produit n'a ni taille ni couleur à choisir, sinon la fiche s'ouvre.
import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, GRADIENTS, RADIUS, SOFT, sheet } from '../theme';
import { categoryIcon, categoryToneIndex } from '../lib/categories';
import { accentOf, fmt, onColor, ratingLabel, swatchOf, thumbUrl } from '../lib/format';
import { galleryOf, isLowStock, isSoldOut } from '../lib/shop';
import { needsChoice, productOptions } from '../lib/shared';
import { useFavorites } from '../lib/favorites';
import { useCart } from '../lib/cart';
import { buzzSuccess, buzzWarning } from '../lib/feedback';
import HeartButton from './HeartButton';
import { PressScale } from './ui';

const MULTI = ['#f472b6', '#f6c768', '#2dd4bf', '#8a7cf1'];

// Pastilles des couleurs proposées (4 au plus, puis « +2 »).
function Swatches({ colors }) {
  const shown = colors.slice(0, 4);
  return (
    <View style={styles.swatches} accessibilityLabel={`Couleurs : ${colors.join(', ')}`}>
      <Ionicons name="color-palette-outline" size={12} color={COLORS.muted} style={{ marginRight: 1 }} />
      {shown.map((c) => {
        const hex = swatchOf(c);
        return hex === 'multi' ? (
          <LinearGradient key={c} colors={MULTI} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch} />
        ) : (
          <View key={c} style={[styles.swatch, { backgroundColor: hex || COLORS.raised }]}>
            {hex ? null : <Text style={styles.swatchLetter}>{String(c).charAt(0).toUpperCase()}</Text>}
          </View>
        );
      })}
      {colors.length > shown.length ? <Text style={styles.swatchMore}>+{colors.length - shown.length}</Text> : null}
    </View>
  );
}

// shop : boutique du produit quand le produit ne la porte pas déjà (page boutique).
function ProductCard({ product, rating, width, onPress, shopName, shop, layout = 'grid' }) {
  const soldOut = isSoldOut(product);
  const favorites = useFavorites();
  const cart = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const owner = shop || product.shop || null;
  // Mis en ligne il y a moins de 21 jours (date de publication, sinon de création).
  const since = Date.parse(product.published_at || product.created_at || '');
  const isNew = Number.isFinite(since) && Date.now() - since < 21 * 864e5;
  const topRated = rating && rating.count >= 3 && rating.average >= 4.5;
  const opts = productOptions(product);
  const sizesHint = opts.sizes.length > 1 ? `${opts.sizes.length} ${opts.legacyList ? 'options' : 'tailles'}` : '';
  const photos = galleryOf(product).length;
  const ownerName = owner?.shop_name || shopName || '';
  const ownerColor = accentOf(owner?.theme_color, COLORS.brand);
  const choice = needsChoice(product);
  const category = product.category || '';
  const tone = SOFT[categoryToneIndex(category) % SOFT.length];
  const stockState = soldOut ? null : isLowStock(product) ? 'low' : typeof product.stock === 'number' ? 'ok' : null;

  const quickAdd = () => {
    if (soldOut || !ownerName || choice) { onPress?.(); return; }
    const result = cart.add(ownerName, product, '', owner);
    if (!result.ok) { buzzWarning(); onPress?.(); return; }
    buzzSuccess();
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1400);
  };

  const label = `${product.name}, ${fmt(product.price_fcfa)} francs${soldOut ? ', épuisé' : ''}`;
  const addButton = (size) => (
    <PressScale onPress={quickAdd} scaleTo={0.85} hitSlop={8} accessibilityLabel={choice ? `Choisir la taille de ${product.name}` : `Ajouter ${product.name} au panier`}>
      <LinearGradient colors={added ? [COLORS.green, '#059669'] : GRADIENTS.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.add, { width: size, height: size, borderRadius: size / 2 }]}>
        <Ionicons name={added ? 'checkmark' : choice ? 'options' : 'add'} size={size * 0.5} color={added ? '#fff' : COLORS.ctaInk} />
      </LinearGradient>
    </PressScale>
  );
  const photo = (
    <>
      {product.image_url ? (
        <Image source={thumbUrl(product.image_url)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" />
      ) : (
        <Ionicons name="image-outline" size={30} color={COLORS.faint} />
      )}
      {product.image_url ? <LinearGradient colors={['transparent', 'rgba(7,6,26,0.6)']} style={styles.photoShade} pointerEvents="none" /> : null}
      {soldOut ? <View style={styles.soldOut}><Text style={styles.soldOutText}>Épuisé</Text></View> : null}
    </>
  );
  const meta = (rating || sizesHint) ? (
    <View style={styles.meta}>
      {rating ? <><Ionicons name="star" size={11} color={COLORS.gold} /><Text style={styles.metaStrong}>{ratingLabel(rating.average)}</Text><Text style={styles.metaText}>({rating.count})</Text></> : null}
      {rating && sizesHint ? <Text style={styles.metaText}> · </Text> : null}
      {sizesHint ? <><Ionicons name="resize-outline" size={11} color={COLORS.muted} /><Text style={styles.metaText}>{sizesHint}</Text></> : null}
    </View>
  ) : null;
  const shopRow = shopName ? (
    <View style={styles.shopRow}>
      <View style={[styles.shopIcon, { backgroundColor: ownerColor }]}><Ionicons name="storefront" size={8} color={onColor(ownerColor)} /></View>
      <Text style={styles.shop} numberOfLines={1}>{shopName}</Text>
    </View>
  ) : null;
  const price = (
    <Text style={[styles.price, soldOut && styles.priceOff]} numberOfLines={1}>{fmt(product.price_fcfa)}<Text style={styles.currency}> F</Text></Text>
  );
  const categoryChip = category ? (
    <View style={[styles.catChip, { backgroundColor: tone.bg }]}>
      <Ionicons name={categoryIcon(category)} size={11} color={tone.fg} />
      <Text style={[styles.catText, { color: tone.fg }]} numberOfLines={1}>{category}</Text>
    </View>
  ) : null;
  // Icônes de service (en stock, livraison à domicile, paiement à la livraison)
  const perks = soldOut ? null : (
    <View style={styles.perks} accessibilityLabel={`${stockState === 'low' ? `Plus que ${product.stock}, ` : stockState === 'ok' ? 'En stock, ' : ''}livraison à domicile, paiement à la livraison`}>
      {stockState === 'ok' ? <View style={[styles.perk, { backgroundColor: COLORS.greenSoft }]}><Ionicons name="checkmark" size={11} color={COLORS.green} /></View> : null}
      {stockState === 'low' ? <View style={[styles.perk, { backgroundColor: COLORS.goldSoft }]}><Ionicons name="flame" size={11} color={COLORS.goldInk} /></View> : null}
      <View style={[styles.perk, { backgroundColor: COLORS.brandSoft }]}><Ionicons name="bicycle" size={11} color={COLORS.brand} /></View>
      <View style={[styles.perk, { backgroundColor: 'rgba(52,211,153,0.1)' }]}><Ionicons name="cash-outline" size={11} color="#6ee7b7" /></View>
    </View>
  );
  const listChips = (
    <View style={styles.listChips}>
      {categoryChip}
      {stockState === 'ok' ? <View style={[styles.catChip, { backgroundColor: COLORS.greenSoft }]}><Ionicons name="checkmark-circle" size={11} color={COLORS.green} /><Text style={[styles.catText, { color: COLORS.green }]}>En stock</Text></View> : null}
      {stockState === 'low' ? <View style={[styles.catChip, { backgroundColor: COLORS.goldSoft }]}><Ionicons name="flame" size={11} color={COLORS.goldInk} /><Text style={[styles.catText, { color: COLORS.goldInk }]}>Plus que {product.stock}</Text></View> : null}
      {!soldOut ? <View style={[styles.catChip, { backgroundColor: COLORS.brandSoft }]}><Ionicons name="bicycle" size={11} color={COLORS.brand} /><Text style={[styles.catText, { color: COLORS.brand }]}>Livraison</Text></View> : null}
    </View>
  );

  if (layout === 'list') {
    return (
      <PressScale onPress={onPress} style={[styles.listCard, { width }]} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={label}>
        <View style={styles.listPhoto}>
          {photo}
          {isNew && !soldOut ? <View style={[styles.badge, styles.badgeGold, styles.badgeSmall]}><Ionicons name="sparkles" size={9} color={COLORS.ctaInk} /><Text style={styles.badgeGoldText}>Nouveau</Text></View> : null}
        </View>
        <View style={styles.listBody}>
          {shopRow}
          <Text style={styles.listName} numberOfLines={2}>{product.name}</Text>
          {meta}
          {opts.colors.length ? <Swatches colors={opts.colors} /> : null}
          {listChips}
          <View style={styles.listBottom}>
            {price}
            <View style={styles.listActions}>
              <HeartButton active={favorites.isProduct(product.id)} onToggle={() => favorites.toggleProduct(product, owner)} size={34} />
              {!soldOut ? addButton(36) : null}
            </View>
          </View>
        </View>
      </PressScale>
    );
  }

  return (
    <PressScale onPress={onPress} style={[styles.card, { width }]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.photo}>
        {photo}
        <View style={styles.badges}>
          {isNew && !soldOut ? <View style={[styles.badge, styles.badgeGold]}><Ionicons name="sparkles" size={10} color={COLORS.ctaInk} /><Text style={styles.badgeGoldText}>Nouveau</Text></View> : null}
          {topRated ? <View style={[styles.badge, styles.badgeGlass]}><Ionicons name="star" size={10} color={COLORS.gold} /><Text style={styles.badgeGlassText}>Coup de cœur</Text></View> : null}
        </View>
        <HeartButton active={favorites.isProduct(product.id)} onToggle={() => favorites.toggleProduct(product, owner)} size={32} style={styles.heart} />
        <View style={styles.photoBottom} pointerEvents="box-none">
          {!soldOut && isLowStock(product) ? (
            <View style={[styles.badge, styles.badgeWarn]}><Text style={styles.badgeWarnText}>Plus que {product.stock}</Text></View>
          ) : photos > 1 ? (
            <View style={[styles.badge, styles.badgeGlass]}><Ionicons name="images-outline" size={11} color="#fff" /><Text style={styles.badgeGlassText}>{photos}</Text></View>
          ) : category ? (
            <View style={[styles.badge, styles.badgeGlass, styles.badgeRound]}><Ionicons name={categoryIcon(category)} size={13} color="#fff" /></View>
          ) : <View />}
          {!soldOut ? addButton(38) : null}
        </View>
      </View>
      <View style={styles.body}>
        {shopRow}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {categoryChip}
        {meta}
        {opts.colors.length ? <Swatches colors={opts.colors} /> : null}
        <View style={styles.priceRow}>
          {price}
          {perks}
        </View>
      </View>
    </PressScale>
  );
}

export default memo(ProductCard);

const styles = sheet({
  // Grille
  card: { marginBottom: 18 },
  photo: {
    aspectRatio: 0.8, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.raised,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  photoShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%' },
  badges: { position: 'absolute', top: 9, left: 9, gap: 5, alignItems: 'flex-start' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeSmall: { position: 'absolute', top: 7, left: 7, paddingHorizontal: 6, paddingVertical: 3 },
  badgeGold: { backgroundColor: COLORS.cta },
  badgeGoldText: { color: COLORS.ctaInk, fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  badgeGlass: { backgroundColor: 'rgba(10,8,32,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  badgeGlassText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
  badgeWarn: { backgroundColor: 'rgba(59,44,18,0.92)', borderWidth: 1, borderColor: 'rgba(246,199,104,0.45)' },
  badgeWarnText: { color: COLORS.goldInk, fontSize: 10.5, fontWeight: '800' },
  heart: { position: 'absolute', top: 8, right: 8 },
  photoBottom: { position: 'absolute', left: 9, right: 9, bottom: 9, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  add: {
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f3a953', shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  soldOut: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,6,26,0.6)', alignItems: 'center', justifyContent: 'center' },
  soldOutText: {
    backgroundColor: 'rgba(7,6,26,0.9)', color: '#fff', fontWeight: '800', fontSize: 12, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  body: { paddingTop: 9, paddingHorizontal: 2, gap: 3 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shopIcon: { width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  catText: { fontSize: 10.5, fontWeight: '800', flexShrink: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 },
  perks: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  perk: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeRound: { width: 28, height: 28, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center' },
  listChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  shop: { flex: 1, color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  name: { color: COLORS.ink, fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaStrong: { color: COLORS.ink, fontSize: 11.5, fontWeight: '800' },
  metaText: { color: COLORS.muted, fontSize: 11.5, fontWeight: '600' },
  swatches: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  swatchLetter: { color: COLORS.ink, fontSize: 8, fontWeight: '800' },
  swatchMore: { color: COLORS.muted, fontSize: 11, fontWeight: '700', marginLeft: 2 },
  price: { flexShrink: 1, color: COLORS.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  currency: { fontSize: 12, fontWeight: '700', color: COLORS.goldInk },
  priceOff: { color: COLORS.faint },
  // Liste
  listCard: {
    flexDirection: 'row', gap: 12, padding: 10, marginBottom: 12, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  listPhoto: {
    width: 112, height: 140, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.raised,
    alignItems: 'center', justifyContent: 'center',
  },
  listBody: { flex: 1, gap: 4, paddingVertical: 2 },
  listName: { color: COLORS.ink, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  listBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  listActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
