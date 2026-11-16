// Logo SamaBoutik : mêmes tracés et couleurs que le site (src/components/brand/Logo.jsx).
// Sac de boutique indigo marqué d'un « S » blanc, anse dorée et étincelle.
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { COLORS, sheet } from '../theme';

export function LogoMark({ size = 40 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="SamaBoutik">
      <Defs>
        <LinearGradient id="sbBag" x1="12" y1="20" x2="50" y2="62" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#6a58e8" />
          <Stop offset="0.6" stopColor="#3b2fc9" />
          <Stop offset="1" stopColor="#2a2580" />
        </LinearGradient>
        <LinearGradient id="sbGold" x1="22" y1="9" x2="42" y2="26" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#fde68a" />
          <Stop offset="1" stopColor="#e8a33d" />
        </LinearGradient>
      </Defs>
      <Path d="M22 25v-6a10 10 0 0 1 20 0v6" fill="none" stroke="url(#sbGold)" strokeWidth={4.4} strokeLinecap="round" />
      <Path d="M12 22.5h40l3 30a6.5 6.5 0 0 1-6.47 7.15H15.47A6.5 6.5 0 0 1 9 52.5z" fill="url(#sbBag)" />
      <Path d="M12 22.5h40l.42 4.2H11.58z" fill="#000" opacity={0.18} />
      <Path
        transform="translate(32 42.6) scale(1.38) translate(-32 -38.6)"
        d="M37.2 31.6c-1.4-1.3-3.2-1.9-5.3-1.9-3.4 0-5.7 1.8-5.7 4.3 0 5.8 11.6 3.1 11.6 8.6 0 2.6-2.5 4.3-6 4.3-2.6 0-4.7-.9-6.1-2.4"
        fill="none" stroke="#fff" strokeWidth={3.3} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M54.5 5.5l1.5 3.9 3.9 1.5-3.9 1.5-1.5 3.9-1.5-3.9-3.9-1.5 3.9-1.5z" fill="#e8a33d" />
    </Svg>
  );
}

// Symbole + nom « SamaBoutik » (Sama en bleu nuit, Boutik en indigo), comme sur le site.
// light : version pour fond sombre ou dégradé (Sama en blanc, Boutik en lavande), avec une pastille blanche.
export default function Logo({ size = 40, textSize = 24, light = false }) {
  return (
    <View style={styles.row}>
      {light ? <View style={[styles.markBox, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 3 }]}><LogoMark size={size} /></View> : <LogoMark size={size} />}
      <Text style={[styles.text, { fontSize: textSize }]}>
        <Text style={{ color: light ? '#ffffff' : COLORS.ink }}>Sama</Text>
        <Text style={{ color: light ? '#cfcbfb' : COLORS.brand }}>Boutik</Text>
      </Text>
    </View>
  );
}

const styles = sheet({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markBox: { backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '900', letterSpacing: -0.8 },
});
