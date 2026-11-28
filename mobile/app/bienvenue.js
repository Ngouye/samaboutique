// Premier lancement : trois pages de présentation, puis l'accueil (affichées une seule fois).
// Style « nuit de Dakar » : lueur de couleur, anneaux de radar, pastille dorée, mot clé en italique.
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';
import { LogoMark } from '../src/components/Logo';
import { Editorial, Glow, GradientButton } from '../src/components/ui';
import { store } from '../src/lib/storage';
import { COLORS, GRADIENTS, sheet } from '../src/theme';

const PAGES = [
  { icon: 'storefront', title: 'Toutes les boutiques', accent: 'du Sénégal', text: 'Mode, beauté, high-tech, maison… découvrez les commerçants près de chez vous, dans une seule application.', glow: '#8a7cf1' },
  { icon: 'shield-checkmark', title: 'Payez à la livraison', accent: 'avec 10 %', text: 'Un petit acompte en ligne confirme votre commande. Le reste, vous le payez au livreur en recevant votre colis.', glow: '#2dd4bf' },
  { icon: 'bicycle', title: 'Suivez votre colis', accent: 'en direct', text: 'Commande reçue, en préparation, en route : vous savez tout, et un code secret protège la remise.', glow: '#f6c768' },
];

// Gribouillis dessinés à la main (or et indigo), pour un côté vivant
function Doodles({ glow }) {
  return (
    <>
      <Svg width={120} height={70} viewBox="0 0 120 70" style={{ position: 'absolute', top: 92, left: 6 }} pointerEvents="none">
        <Path d="M6 50 C 20 10, 34 62, 48 26 S 76 8, 82 40 S 108 56, 114 18" stroke={COLORS.gold} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.9} />
      </Svg>
      <Svg width={96} height={96} viewBox="0 0 96 96" style={{ position: 'absolute', bottom: 34, right: 10 }} pointerEvents="none">
        <Path d="M14 70 C 8 40, 40 20, 60 34 C 78 46, 64 74, 44 66 C 28 60, 36 36, 58 30 C 74 26, 86 40, 84 54" stroke={glow} strokeWidth={4.5} strokeLinecap="round" fill="none" opacity={0.85} />
      </Svg>
      <Svg width={40} height={40} viewBox="0 0 40 40" style={{ position: 'absolute', top: 150, right: 34 }} pointerEvents="none">
        <Path d="M20 4 L23 16 L36 20 L23 24 L20 36 L17 24 L4 20 L17 16 Z" fill={COLORS.goldInk} opacity={0.9} />
      </Svg>
    </>
  );
}

// Anneaux concentriques et points en orbite autour de l'icône (comme le radar de l'annuaire du site)
function Rings({ glow }) {
  return (
    <View style={styles.rings} pointerEvents="none">
      {[300, 228, 160].map((d) => <View key={d} style={[styles.ring, { width: d, height: d, borderRadius: d / 2 }]} />)}
      <View style={[styles.orbitDot, { top: 8, left: 138, backgroundColor: COLORS.gold }]} />
      <View style={[styles.orbitDot, { bottom: 52, right: 30, backgroundColor: glow, width: 8, height: 8 }]} />
      <View style={[styles.orbitDot, { top: 118, left: 22, backgroundColor: '#fff', opacity: 0.5, width: 6, height: 6 }]} />
    </View>
  );
}

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
  const last = page === PAGES.length - 1;

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
            <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.art, { paddingTop: insets.top + 40 }]}>
              <Glow color={p.glow} size={420} opacity={0.5} style={{ top: -40 }} />
              <Glow color={COLORS.gold} size={220} opacity={0.14} style={{ bottom: -110, left: -70 }} />
              <Rings glow={p.glow} />
              <Doodles glow={p.glow} />
              <View style={styles.iconOuter}>
                <LinearGradient colors={GRADIENTS.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconInner}>
                  <Ionicons name={p.icon} size={56} color={COLORS.ctaInk} />
                </LinearGradient>
              </View>
            </LinearGradient>
            <View style={styles.copy}>
              <Text style={styles.title}>{p.title}{'\n'}<Editorial>{p.accent}</Editorial></Text>
              <Text style={styles.text}>{p.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.top, { top: insets.top + 12 }]}>
        <View style={styles.brand}><LogoMark size={26} /><Text style={styles.brandText}>Sama<Text style={{ color: COLORS.brand }}>Boutik</Text></Text></View>
        <Pressable onPress={finish} hitSlop={10} style={styles.skipButton}><Text style={styles.skip}>Passer</Text></Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {PAGES.map((p, i) => <View key={p.title} style={[styles.dot, i === page && styles.dotOn]} />)}
        </View>
        <GradientButton title={last ? 'Commencer mes achats' : 'Suivant'} icon={last ? 'sparkles' : 'arrow-forward'} onPress={next} />
      </View>
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  art: {
    height: 440, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 44, borderBottomRightRadius: 44, overflow: 'hidden',
    borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(255,255,255,0.07)',
  },
  rings: { position: 'absolute', width: 300, height: 300, bottom: 40, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  orbitDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  iconOuter: {
    marginTop: 30, width: 150, height: 150, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconInner: { width: 108, height: 108, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  copy: { paddingHorizontal: 28, paddingTop: 32 },
  title: { color: COLORS.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 37 },
  text: { color: COLORS.muted, fontSize: 15.5, lineHeight: 23, marginTop: 12 },
  top: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
    paddingLeft: 6, paddingRight: 12, paddingVertical: 5, borderRadius: 999,
  },
  brandText: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  skipButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  skip: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 22 },
  dots: { flexDirection: 'row', gap: 7, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotOn: { width: 26, backgroundColor: COLORS.gold },
});
