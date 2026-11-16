// Premier lancement : trois pages de présentation, puis l'accueil (affichées une seule fois).
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LogoMark } from '../src/components/Logo';
import { GradientButton } from '../src/components/ui';
import { store } from '../src/lib/storage';
import { COLORS, GRADIENTS, sheet } from '../src/theme';

const PAGES = [
  { icon: 'storefront', title: 'Toutes les boutiques du Sénégal', text: 'Mode, beauté, high-tech, maison… découvrez les commerçants près de chez vous, dans une seule application.', colors: GRADIENTS.hero },
  { icon: 'shield-checkmark', title: 'Payez à la livraison avec 10 %', text: 'Un petit acompte en ligne confirme votre commande. Le reste, vous le payez au livreur en recevant votre colis.', colors: GRADIENTS.teal },
  { icon: 'bicycle', title: 'Suivez votre colis en direct', text: 'Commande reçue, en préparation, en route : vous savez tout, et un code secret protège la remise.', colors: GRADIENTS.sunset },
];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef(null);
  const [page, setPage] = useState(0);

  const finish = () => {
    store.set('onboarded', true);
    router.replace('/');
  };
  const next = () => {
    if (page >= PAGES.length - 1) return finish();
    scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
    return null;
  };
  const current = PAGES[page];

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={{ width }}>
            <LinearGradient colors={p.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.art, { paddingTop: insets.top + 30 }]}>
              <View style={[styles.ring, { width: 300, height: 300, top: -60, right: -90 }]} />
              <View style={[styles.ring, { width: 200, height: 200, bottom: -40, left: -60, opacity: 0.1 }]} />
              <View style={styles.iconOuter}>
                <View style={styles.iconInner}><Ionicons name={p.icon} size={64} color={p.colors[1]} /></View>
              </View>
            </LinearGradient>
            <View style={styles.copy}>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.text}>{p.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.top, { top: insets.top + 12 }]}>
        <View style={styles.brand}><LogoMark size={28} /><Text style={styles.brandText}>SamaBoutik</Text></View>
        <Pressable onPress={finish} hitSlop={10}><Text style={styles.skip}>Passer</Text></Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {PAGES.map((p, i) => <View key={p.title} style={[styles.dot, i === page && { width: 26, backgroundColor: current.colors[1] }]} />)}
        </View>
        <GradientButton
          title={page === PAGES.length - 1 ? 'Commencer mes achats' : 'Suivant'}
          icon={page === PAGES.length - 1 ? 'sparkles' : 'arrow-forward'}
          colors={current.colors}
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  art: { height: 430, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 44, borderBottomRightRadius: 44, overflow: 'hidden' },
  ring: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.14 },
  iconOuter: { width: 170, height: 170, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 124, height: 124, borderRadius: 44, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  copy: { paddingHorizontal: 28, paddingTop: 34 },
  title: { color: COLORS.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, lineHeight: 34 },
  text: { color: COLORS.muted, fontSize: 15.5, lineHeight: 23, marginTop: 12 },
  top: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingLeft: 6, paddingRight: 12, paddingVertical: 5, borderRadius: 999 },
  brandText: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  skip: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 22 },
  dots: { flexDirection: 'row', gap: 7, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d6d2c8' },
});
