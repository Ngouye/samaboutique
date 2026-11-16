// Bannières de l'accueil : défilent toutes seules toutes les 4 secondes, avec des points de position.
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, GRADIENTS, sheet } from '../theme';

const SLIDES = [
  { kicker: 'PAIEMENT À LA LIVRAISON', title: 'Un acompte de 10 % suffit', text: 'Payez le reste au livreur, à la réception de votre colis.', icon: 'shield-checkmark', colors: GRADIENTS.hero },
  { kicker: 'PAIEMENT MOBILE', title: 'Wave, Orange Money, Free Money', text: 'Payez en toute sécurité depuis votre téléphone.', icon: 'wallet', colors: GRADIENTS.teal },
  { kicker: 'LIVRAISON SUIVIE', title: 'Suivez votre livreur en direct', text: 'Un code secret protège la remise de votre colis.', icon: 'bicycle', colors: GRADIENTS.sunset },
  { kicker: 'MADE IN SÉNÉGAL', title: 'Les boutiques près de chez vous', text: 'Mode, beauté, high-tech… des commerçants de confiance.', icon: 'storefront', colors: GRADIENTS.rose },
];

export default function PromoCarousel() {
  const { width } = useWindowDimensions();
  const slideWidth = width - 32;
  const scroller = useRef(null);
  const [index, setIndex] = useState(0);
  const touching = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (touching.current) return;
      setIndex((i) => {
        const next = (i + 1) % SLIDES.length;
        scroller.current?.scrollTo({ x: next * (slideWidth + 12), animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [slideWidth]);

  return (
    <View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        onScrollBeginDrag={() => { touching.current = true; }}
        onMomentumScrollEnd={(e) => { touching.current = false; setIndex(Math.round(e.nativeEvent.contentOffset.x / (slideWidth + 12))); }}
      >
        {SLIDES.map((s) => (
          <LinearGradient key={s.title} colors={s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.slide, { width: slideWidth }]}>
            <View style={[styles.bubble, { right: -40, top: -50, width: 170, height: 170 }]} />
            <View style={[styles.bubble, { right: 70, bottom: -60, width: 120, height: 120, opacity: 0.08 }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{s.kicker}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.text}>{s.text}</Text>
            </View>
            <View style={styles.icon}><Ionicons name={s.icon} size={30} color={s.colors[1]} /></View>
          </LinearGradient>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((s, i) => <View key={s.title} style={[styles.dot, i === index && styles.dotOn]} />)}
      </View>
    </View>
  );
}

const styles = sheet({
  slide: { borderRadius: 24, padding: 20, minHeight: 138, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
  bubble: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.12 },
  kicker: { color: 'rgba(255,255,255,0.78)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 5, letterSpacing: -0.4, lineHeight: 24 },
  text: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 18, marginTop: 5 },
  icon: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d6d2c8' },
  dotOn: { width: 22, backgroundColor: COLORS.brand },
});
