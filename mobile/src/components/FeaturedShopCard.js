// Grande carte d'une boutique pour le carrousel de l'accueil.
// Le nom et les informations sont sous l'image, sur fond blanc : lisibles quelle que soit la bannière du commerçant.
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOW, sheet } from '../theme';
import { accentOf, fmt, initials, onColor, ratingLabel, thumbUrl } from '../lib/format';

function FeaturedShopCard({ shop, width, onPress }) {
  const cover = shop.banner_url || shop.cover_images?.[0] || null;
  const accent = accentOf(shop.theme_color);
  const reviews = Number(shop.reviews_count) || 0;
  const products = Number(shop.products_count) || 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { width }, pressed && { opacity: 0.92 }]} accessibilityRole="button" accessibilityLabel={`Ouvrir la boutique ${shop.shop_name}`}>
      <View style={[styles.cover, { backgroundColor: accent }]}>
        {cover ? <Image source={thumbUrl(cover)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" /> : null}
        {shop.featured ? <View style={styles.badge}><Ionicons name="star" size={10} color={COLORS.goldInk} /><Text style={styles.badgeText}>À la une</Text></View> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.logoWrap}>
            {shop.logo_url ? (
              <Image source={thumbUrl(shop.logo_url)} style={styles.logo} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={[styles.logo, { backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[styles.initials, { color: onColor(accent) }]}>{initials(shop.shop_name)}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, paddingTop: 6 }}>
            <Text style={styles.name} numberOfLines={1}>{shop.shop_name}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="star" size={12} color={reviews ? COLORS.gold : COLORS.faint} />
              <Text style={styles.meta}>{reviews ? `${ratingLabel(shop.rating)} (${reviews})` : 'Nouvelle'} · {products} produit{products > 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>{shop.description || 'Découvrez la boutique et ses produits.'}</Text>
        {shop.min_price_fcfa != null ? <Text style={styles.price}>À partir de <Text style={styles.priceStrong}>{fmt(shop.min_price_fcfa)} F</Text></Text> : null}
      </View>
    </Pressable>
  );
}

export default memo(FeaturedShopCard);

const styles = sheet({
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW, shadowOpacity: 0.07 },
  cover: { height: 128 },
  badge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.goldSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { color: COLORS.goldInk, fontSize: 11, fontWeight: '800' },
  body: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  logoWrap: { marginTop: -24, width: 54, height: 54, borderRadius: 16, backgroundColor: COLORS.card, padding: 3, ...SHADOW, shadowOpacity: 0.1 },
  logo: { width: 48, height: 48, borderRadius: 13 },
  initials: { fontSize: 16, fontWeight: '800' },
  name: { color: COLORS.ink, fontSize: 16.5, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  meta: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  description: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  price: { color: COLORS.muted, fontSize: 12.5, fontWeight: '600' },
  priceStrong: { color: COLORS.ink, fontWeight: '800' },
});
