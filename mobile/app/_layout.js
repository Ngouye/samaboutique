// Navigation de l'application (Expo Router : chaque fichier du dossier app/ est un écran).
// Les onglets du bas (accueil, explorer, panier, commandes) sont dans app/(tabs) ; les autres écrans s'ouvrent par-dessus.
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { COLORS } from '../src/theme';
import { CartProvider } from '../src/lib/cart';
import { FavoritesProvider } from '../src/lib/favorites';

// L'écran de démarrage reste affiché le temps de charger la police de SamaBoutik.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <CartProvider>
      <FavoritesProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        </Stack>
      </FavoritesProvider>
    </CartProvider>
  );
}
