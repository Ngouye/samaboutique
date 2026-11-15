// Carte d'une boutique dans la liste : bannière, logo, nom, description, note, produits, prix de départ.
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOW, sheet } from '../theme';
import { accentOf, fmt, initials, ratingLabel, thumbUrl } from '../lib/format';

function ShopCard({ shop, onPress }) {
  const cover = shop.banner_url || shop.cover_images?.[0] || null;
  const accent = accentOf(shop.theme_color);
  const reviews = Number(shop.reviews_count) || 0;
  const products = Number(shop.products_count) || 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la boutique ${shop.shop_name}`}
    >
      <View style={[styles.cover, { backgroundColor: accent }]}>
        {cover ? (
          <Image source={thumbUrl(cover)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" />
        ) : null}
        {shop.featured ? (
          <View style={styles.featured}>
            <Ionicons name="star" size={11} color={COLORS.goldInk} />
            <Text style={styles.featuredText}>À la une</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.logoWrap}>
        {shop.logo_url ? (
          <Image source={thumbUrl(shop.logo_url)} style={styles.logo} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.logo, styles.logoFallback, { backgroundColor: accent }]}>
            <Text style={styles.logoInitials}>{initials(shop.shop_name)}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{shop.shop_name}</Text>
        {shop.description ? <Text style={styles.description} numberOfLines={2}>{shop.description}</Text> : null}

        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Ionicons name="star" size={12} color={reviews ? COLORS.gold : COLORS.faint} />
            <Text style={styles.chipText}>{reviews ? `${ratingLabel(shop.rating)} (${reviews})` : 'Nouvelle'}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="pricetags-outline" size={12} color={COLORS.brand} />
            <Text style={styles.chipText}>{products} produit{products > 1 ? 's' : ''}</Text>
          </View>
          {shop.min_price_fcfa != null ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>dès <Text style={styles.chipStrong}>{fmt(shop.min_price_fcfa)} F</Text></Text>
            </View>
          ) : null}
        </View>

        {shop.address ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.muted} />
            <Text style={styles.address} numberOfLines={1}>{shop.address}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default memo(ShopCard);

const styles = sheet({
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, marginBottom: 16, overflow: 'hidden', ...SHADOW },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  cover: { height: 132, width: '100%' },
  featured: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.goldSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  featuredText: { color: COLORS.goldInk, fontSize: 11, fontWeight: '800' },
  logoWrap: { marginTop: -28, marginLeft: 14, width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.card, padding: 3, ...SHADOW },
  logo: { width: 50, height: 50, borderRadius: 13 },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoInitials: { color: '#fff', fontSize: 17, fontWeight: '800' },
  body: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14 },
  name: { color: COLORS.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  description: { color: COLORS.muted, fontSize: 13.5, lineHeight: 19, marginTop: 3 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  chipText: { color: COLORS.ink, fontSize: 12, fontWeight: '600' },
  chipStrong: { fontWeight: '800' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9 },
  address: { color: COLORS.muted, fontSize: 12.5, flex: 1 },
});
