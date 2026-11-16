// Bouton cœur des favoris : rond blanc, cœur rouge quand l'élément est en favori, petit rebond au toucher.
import { useRef } from 'react';
import { Animated, Platform, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { buzzLight } from '../lib/feedback';
import { COLORS, SHADOW } from '../theme';

export const HEART_RED = '#e5484d';
const native = Platform.OS !== 'web';

export default function HeartButton({ active, onToggle, size = 34, label = 'Ajouter aux favoris', style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    buzzLight();
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.25, duration: 110, useNativeDriver: native }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: native }),
    ]).start();
    onToggle?.();
  };
  return (
    <Pressable
      onPress={press}
      hitSlop={8}
      // Sur le web (tests), un bouton ne peut pas être dans la carte, elle-même un bouton : rôle ARIA seulement sur téléphone.
      accessibilityRole={native ? 'button' : undefined}
      accessibilityLabel={active ? 'Retirer des favoris' : label}
      accessibilityState={{ selected: active }}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...SHADOW, shadowOpacity: 0.1 }, style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={active ? 'heart' : 'heart-outline'} size={Math.round(size * 0.55)} color={active ? HEART_RED : COLORS.ink} />
      </Animated.View>
    </Pressable>
  );
}
