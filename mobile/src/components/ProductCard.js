// Carte d'un produit : photo, cœur des favoris, nom, prix, note, stock, boutique (catalogue) et ajout rapide « + ».
// Ajout rapide : directement au panier si le produit n'a ni taille ni couleur à choisir, sinon la fiche s'ouvre.
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, GRADIENTS, RADIUS, SHADOW, sheet } from '../theme';
import { fmt, ratingLabel, thumbUrl } from '../lib/format';
import { isLowStock, isSoldOut } from '../lib/shop';
import { needsChoice, productOptions } from '../lib/shared';
import { useFavorites } from '../lib/favorites';
import { useCart } from '../lib/cart';
import { buzzSuccess, buzzWarning } from '../lib/feedback';
import HeartButton from './HeartButton';
import { PressScale } from './ui';

// shop : boutique du produit quand le produit ne la porte pas déjà (page boutique).
function ProductCard({ product, rating, width, onPress, shopName, shop }) {
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
  const opts = productOptions(product);
  const optionsHint = [opts.sizes.length > 1 ? `${opts.sizes.length} ${opts.legacyList ? 'options' : 'tailles'}` : null, opts.colors.length > 1 ? `${opts.colors.length} couleurs` : null].filter(Boolean).join(' · ');
  const ownerName = owner?.shop_name || shopName || '';

  const quickAdd = () => {
    if (soldOut || !ownerName || needsChoice(product)) { onPress?.(); return; }
    const result = cart.add(ownerName, product, '', owner);
    if (!result.ok) { buzzWarning(); onPress?.(); return; }
    buzzSuccess();
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1400);
  };

  return (
    <PressScale onPress={onPress} style={[styles.card, { width }]} accessibilityRole="button" accessibilityLabel={`${product.name}, ${fmt(product.price_fcfa)} francs${soldOut ? ', épuisé' : ''}`}>
      <View style={styles.photo}>
        {product.image_url ? (
          <Image source={thumbUrl(product.image_url)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" />
        ) : (
          <Ionicons name="image-outline" size={30} color={COLORS.faint} />
        )}
        {product.image_url ? <LinearGradient colors={['transparent', 'rgba(11,10,38,0.28)']} style={styles.photoShade} pointerEvents="none" /> : null}
        {isNew && !soldOut ? (
          <LinearGradient colors={GRADIENTS.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.newBadge}>
            <Ionicons name="sparkles" size={10} color="#fff" />
            <Text style={styles.newText}>Nouveau</Text>
          </LinearGradient>
        ) : null}
        {soldOut ? (
          <View style={styles.soldOut}><Text style={styles.soldOutText}>Épuisé</Text></View>
        ) : isLowStock(product) ? (
          <View style={styles.low}><Text style={styles.lowText}>Plus que {product.stock}</Text></View>
        ) : null}
        <HeartButton active={favorites.isProduct(product.id)} onToggle={() => favorites.toggleProduct(product, owner)} size={32} style={styles.heart} />
      </View>
      <View style={styles.body}>
        {shopName ? <Text style={styles.shop} numberOfLines={1}>{shopName}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {rating || optionsHint ? (
          <View style={styles.rating}>
            {rating ? <><Ionicons name="star" size={11} color={COLORS.gold} /><Text style={styles.ratingText}>{ratingLabel(rating.average)} ({rating.count})</Text></> : null}
            {rating && optionsHint ? <Text style={styles.ratingText}> · </Text> : null}
            {optionsHint ? <Text style={styles.optionsText}>{optionsHint}</Text> : null}
          </View>
        ) : null}
        <View style={styles.bottom}>
          <Text style={[styles.price, soldOut && styles.priceOff]}>{fmt(product.price_fcfa)} <Text style={styles.currency}>F</Text></Text>
          {!soldOut ? (
            <Pressable onPress={quickAdd} hitSlop={8} accessibilityLabel={needsChoice(product) ? `Choisir la taille de ${product.name}` : `Ajouter ${product.name} au panier`} style={styles.addWrap}>
              <LinearGradient colors={added ? [COLORS.green, '#0e5a31'] : GRADIENTS.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.add}>
                <Ionicons name={added ? 'checkmark' : 'add'} size={19} color="#fff" />
              </LinearGradient>
            </Pressable>
          ) : null}
        </View>
      </View>
    </PressScale>
  );
}

export default memo(ProductCard);

const styles = sheet({
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 14, ...SHADOW, shadowOpacity: 0.07 },
  photo: { aspectRatio: 1, backgroundColor: '#efece6', alignItems: 'center', justifyContent: 'center' },
  soldOut: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  soldOutText: { backgroundColor: COLORS.ink, color: '#fff', fontWeight: '800', fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  heart: { position: 'absolute', top: 8, right: 8 },
  photoShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%' },
  newBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  newText: { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  optionsText: { color: COLORS.brand, fontSize: 11, fontWeight: '700' },
  low: { position: 'absolute', left: 8, bottom: 8, backgroundColor: COLORS.goldSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  lowText: { color: COLORS.goldInk, fontSize: 11, fontWeight: '800' },
  body: { padding: 11, gap: 3 },
  shop: { color: COLORS.brand, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { color: COLORS.ink, fontSize: 13.5, fontWeight: '700', lineHeight: 18, minHeight: 36 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: COLORS.muted, fontSize: 11.5, fontWeight: '700' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price: { color: COLORS.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  currency: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  priceOff: { color: COLORS.faint },
  addWrap: { borderRadius: 12, overflow: 'hidden', ...SHADOW, shadowColor: COLORS.brand, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  add: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
