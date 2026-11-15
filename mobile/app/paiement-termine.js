// Écran de passage : PayDunya (via la page /retour-app du site) rouvre l'application ici après le paiement.
// Il s'efface aussitôt pour laisser voir l'écran de confirmation de la commande.
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { shopOfOrder } from '../src/lib/order';
import { COLORS } from '../src/theme';

export default function PaymentReturn() {
  const { commande } = useLocalSearchParams();
  const router = useRouter();
  useEffect(() => {
    const id = String(commande || '');
    if (router.canGoBack()) router.back();
    else if (id) router.replace({ pathname: '/commande/[id]', params: { id, shop: shopOfOrder(id) } });
    else router.replace('/');
  }, [commande, router]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator color={COLORS.brand} />
    </View>
  );
}
