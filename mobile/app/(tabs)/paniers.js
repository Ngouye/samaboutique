// Panier : les paniers en cours de toutes les boutiques (une commande par boutique).
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../../src/lib/cart';
import { cachedMerchant } from '../../src/lib/shop';
import { accentOf, fmt, initials, onColor, thumbUrl } from '../../src/lib/format';
import { COLORS, RADIUS, SHADOW, sheet, TAB_SPACE } from '../../src/theme';

export default function Carts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const carts = cart.shops();
  const total = carts.reduce((n, c) => n + c.count, 0);

  const empty = (shop) => Alert.alert('Vider ce panier ?', `Les articles de ${shop} seront retirés du panier.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Vider', style: 'destructive', onPress: () => cart.clear(shop) },
  ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 10, paddingBottom: TAB_SPACE + insets.bottom, flexGrow: 1 }}>
      <Text style={styles.title}>Mon panier</Text>
      <Text style={styles.subtitle}>
        {carts.length ? `${total} article${total > 1 ? 's' : ''} · ${carts.length} boutique${carts.length > 1 ? 's' : ''}` : 'Une commande par boutique'}
      </Text>

      {carts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="bag-handle-outline" size={38} color={COLORS.brand} /></View>
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptyText}>Parcourez les boutiques et ajoutez vos coups de cœur.</Text>
          <Pressable onPress={() => router.navigate('/')} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Découvrir les boutiques</Text>
          </Pressable>
        </View>
      ) : carts.map((c) => {
        const merchant = cachedMerchant(c.shop) || cart.shopMeta(c.shop);
        const accent = accentOf(merchant?.theme_color);
        const accentText = onColor(accent);
        return (
          <View key={c.shop} style={styles.card}>
            <View style={styles.cardHead}>
              {merchant?.logo_url ? (
                <Image source={thumbUrl(merchant.logo_url)} style={styles.logo} contentFit="cover" />
              ) : (
                <View style={[styles.logo, { backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={[styles.initials, { color: accentText }]}>{initials(c.shop)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.shop} numberOfLines={1}>{c.shop}</Text>
                <Text style={styles.meta}>{c.count} article{c.count > 1 ? 's' : ''}</Text>
              </View>
              <Pressable onPress={() => empty(c.shop)} hitSlop={10} accessibilityLabel={`Vider le panier de ${c.shop}`}>
                <Ionicons name="trash-outline" size={20} color={COLORS.faint} />
              </Pressable>
            </View>

            {c.lines.slice(0, 3).map((line) => (
              <View key={line.key} style={styles.line}>
                <View style={styles.thumb}>
                  {line.product.image_url ? <Image source={thumbUrl(line.product.image_url)} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName} numberOfLines={1}>{line.product.name}</Text>
                  <Text style={styles.lineMeta}>{line.variant ? `${line.variant} · ` : ''}× {line.quantity}</Text>
                </View>
                <Text style={styles.linePrice}>{fmt(line.product.price_fcfa * line.quantity)} F</Text>
              </View>
            ))}
            {c.lines.length > 3 ? <Text style={styles.more}>+ {c.lines.length - 3} autre{c.lines.length - 3 > 1 ? 's' : ''} article{c.lines.length - 3 > 1 ? 's' : ''}</Text> : null}

            <View style={styles.footer}>
              <View>
                <Text style={styles.footerLabel}>Sous-total</Text>
                <Text style={styles.footerAmount}>{fmt(c.subtotal)} F</Text>
              </View>
              <Pressable onPress={() => router.push({ pathname: '/panier/[shop]', params: { shop: c.shop } })} style={({ pressed }) => [styles.order, { backgroundColor: accent }, pressed && { opacity: 0.88 }]}>
                <Text style={[styles.orderText, { color: accentText }]}>Commander</Text>
                <Ionicons name="arrow-forward" size={17} color={accentText} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { color: COLORS.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 2, marginBottom: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 14, ...SHADOW, shadowOpacity: 0.05 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  logo: { width: 44, height: 44, borderRadius: 13 },
  initials: { fontSize: 15, fontWeight: '800' },
  shop: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  meta: { color: COLORS.muted, fontSize: 12.5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  thumb: { width: 46, height: 46, borderRadius: 11, overflow: 'hidden', backgroundColor: '#efece6' },
  lineName: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  lineMeta: { color: COLORS.muted, fontSize: 12.5, marginTop: 1 },
  linePrice: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  more: { color: COLORS.muted, fontSize: 12.5, marginTop: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line },
  footerLabel: { color: COLORS.muted, fontSize: 12 },
  footerAmount: { color: COLORS.ink, fontSize: 19, fontWeight: '800' },
  order: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 20, borderRadius: RADIUS.md },
  orderText: { fontSize: 15, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 86, height: 86, borderRadius: 30, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800', marginTop: 16 },
  emptyText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  emptyButton: { marginTop: 20, backgroundColor: COLORS.ink, paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.md },
  emptyButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
