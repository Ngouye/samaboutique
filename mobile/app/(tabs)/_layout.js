// Onglets du bas : Accueil, Explorer, Panier, Commandes.
import { Tabs } from 'expo-router/js-tabs';
import TabBar from '../../src/components/TabBar';
import { COLORS } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="explorer" options={{ title: 'Explorer' }} />
      <Tabs.Screen name="paniers" options={{ title: 'Panier' }} />
      <Tabs.Screen name="commandes" options={{ title: 'Commandes' }} />
    </Tabs>
  );
}
