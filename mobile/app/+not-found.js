// Page introuvable (remplace l'écran anglais « Unmatched Route » d'Expo Router).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, sheet } from '../src/theme';

export default function NotFound() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Ionicons name="compass-outline" size={48} color={COLORS.faint} />
      <Text style={styles.title}>Page introuvable</Text>
      <Text style={styles.text}>Cette page n’existe pas ou a été déplacée.</Text>
      <Pressable onPress={() => router.replace('/')} style={styles.button}>
        <Text style={styles.buttonText}>Retour à l’accueil</Text>
      </Pressable>
    </View>
  );
}

const styles = sheet({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: COLORS.bg },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: '900', marginTop: 14 },
  text: { color: COLORS.muted, fontSize: 14.5, marginTop: 6, textAlign: 'center' },
  button: { marginTop: 20, backgroundColor: COLORS.ink, paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.md },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
