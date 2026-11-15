// Bloc gris animé affiché pendant le chargement (à la place d'une roue qui tourne).
import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { COLORS } from '../theme';

const native = Platform.OS !== 'web';

export default function Skeleton({ width = '100%', height = 14, radius = 8, style }) {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: native }),
      Animated.timing(pulse, { toValue: 0.55, duration: 750, useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: COLORS.skeleton, opacity: pulse }, style]} />;
}
