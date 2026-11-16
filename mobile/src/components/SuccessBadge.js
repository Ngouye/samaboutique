// Coche de réussite animée : apparaît avec un rebond, entourée d'ondes qui s'agrandissent.
import { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GRADIENTS } from '../theme';

const native = Platform.OS !== 'web';

export default function SuccessBadge({ colors = GRADIENTS.brand, size = 92 }) {
  const pop = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: native }).start();
    const loop = Animated.loop(Animated.timing(wave, { toValue: 1, duration: 1800, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [pop, wave]);
  const ring = (delay) => ({
    position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: colors[0],
    opacity: wave.interpolate({ inputRange: [0, delay, 1], outputRange: [0, 0.28, 0] }),
    transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  });
  return (
    <View style={{ width: size * 1.9, height: size * 1.9, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={ring(0.2)} />
      <Animated.View style={[ring(0.5), { transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] }]} />
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={size * 0.5} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}
