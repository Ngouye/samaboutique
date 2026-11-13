// Moyens de paiement proposés aux clients des vitrines.
// Les paiements mobiles passent par PayDunya, qui ouvre directement la page de l'opérateur choisi
// (identifiants côté serveur : server/routes/payment.js, MOBILE_CHANNELS).
export const MOBILE_CHANNELS = [
  { id: 'wave', label: 'Wave', logo: '/logos/wave.png', tint: '#1dc8ff', ink: '#05323f' },
  { id: 'orange_money', label: 'Orange Money', logo: '/logos/orange-money.svg', tint: '#ff7900', ink: '#ffffff' },
  { id: 'free_money', label: 'Free Money', monogram: 'FM', tint: '#d6001c', ink: '#ffffff' },
  { id: 'wizall', label: 'Wizall Money', monogram: 'WZ', tint: '#0d6fb8', ink: '#ffffff' },
];

export const PAYMENT_CHOICES = [
  { id: 'ON_DELIVERY', label: 'À la livraison', sub: 'Espèces au livreur' },
  ...MOBILE_CHANNELS.map((c) => ({ ...c, sub: 'Paiement sécurisé' })),
];

export const isMobileChannel = (id) => MOBILE_CHANNELS.some((c) => c.id === id);

// Libellé du moyen de paiement d'une commande (tableau de bord, reçus).
export function paymentLabel(order) {
  if (order?.payment_method === 'ON_DELIVERY') return 'À la livraison';
  const channel = MOBILE_CHANNELS.find((c) => c.id === order?.payment_channel);
  if (channel) return channel.label;
  return order?.payment_method === 'MOBILE_MONEY' ? 'Paiement mobile' : 'Autre';
}
