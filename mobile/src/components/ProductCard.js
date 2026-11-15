// Carte d'un produit : photo, nom, prix, note, stock (et la boutique quand le produit vient du catalogue).
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOW, sheet } from '../theme';
import { fmt, ratingLabel, thumbUrl } from '../lib/format';
import { isLowStock, isSoldOut } from '../lib/shop';

function ProductCard({ product, rating, width, onPress, shopName }) {
  const soldOut = isSoldOut(product);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${fmt(product.price_fcfa)} francs${soldOut ? ', épuisé' : ''}`}
    >
      <View style={styles.photo}>
        {product.image_url ? (
          <Image source={thumbUrl(product.image_url)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        ) : (
          <Ionicons name="image-outline" size={30} color={COLORS.faint} />
        )}
        {soldOut ? (
          <View style={styles.soldOut}><Text style={styles.soldOutText}>Épuisé</Text></View>
        ) : isLowStock(product) ? (
          <View style={styles.low}><Text style={styles.lowText}>Plus que {product.stock}</Text></View>
        ) : null}
      </View>
      <View style={styles.body}>
        {shopName ? <Text style={styles.shop} numberOfLines={1}>{shopName}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.bottom}>
          <Text style={[styles.price, soldOut && styles.priceOff]}>{fmt(product.price_fcfa)} F</Text>
          {rating ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={11} color={COLORS.gold} />
              <Text style={styles.ratingText}>{ratingLabel(rating.average)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default memo(ProductCard);

const styles = sheet({
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md + 2, overflow: 'hidden', marginBottom: 12, ...SHADOW, shadowOpacity: 0.06 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  photo: { aspectRatio: 1, backgroundColor: '#efece6', alignItems: 'center', justifyContent: 'center' },
  soldOut: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  soldOutText: { backgroundColor: COLORS.ink, color: '#fff', fontWeight: '800', fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  low: { position: 'absolute', left: 8, bottom: 8, backgroundColor: COLORS.goldSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  lowText: { color: COLORS.goldInk, fontSize: 11, fontWeight: '800' },
  body: { padding: 10, gap: 3 },
  shop: { color: COLORS.brand, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  name: { color: COLORS.ink, fontSize: 13.5, fontWeight: '700', lineHeight: 18, minHeight: 36 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  price: { color: COLORS.ink, fontSize: 15.5, fontWeight: '800' },
  priceOff: { color: COLORS.faint },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: COLORS.muted, fontSize: 11.5, fontWeight: '700' },
});
