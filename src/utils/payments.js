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
  { id: 'ON_DELIVERY', label: 'À la livraison', sub: 'Espèces au livreur', depositSub: 'Acompte de 10 % en ligne, le reste au livreur' },
  ...MOBILE_CHANNELS.map((c) => ({ ...c, sub: 'Paiement sécurisé' })),
];

export const isMobileChannel = (id) => MOBILE_CHANNELS.some((c) => c.id === id);

// Paiement à la livraison : le client paie en ligne un acompte de 10 % du total (articles + livraison),
// arrondi aux 5 F supérieurs pour que le reste en espèces soit rendable ; le livreur encaisse le reste.
// Même calcul en base (acompte_livraison.sql, order_deposit) et sur le serveur (server/lib/deposit.js).
export const DEPOSIT_PERCENT = 10;

export function depositFor(total) {
  const t = Math.max(0, Math.round(Number(total) || 0));
  return Math.min(t, Math.ceil(t / 50) * 5);
}

export const isDeposit = (order) => order?.payment_method === 'DEPOSIT';
export const depositAmount = (order) => (isDeposit(order) ? Number(order.payment_deposit_amount) || depositFor(order.total_amount_fcfa) : 0);
export const depositPaid = (order) => isDeposit(order) && ['DEPOSIT_PAID', 'PAID'].includes(order?.payment_status);

// Commande payée en ligne (en totalité ou par acompte) dont le paiement n'est pas encore confirmé :
// la boutique ne la voit pas tant que le client n'a pas payé.
export function awaitingPayment(order) {
  if (order?.status !== 'PENDING') return false;
  if (order.payment_method === 'MOBILE_MONEY') return order.payment_status !== 'PAID';
  if (isDeposit(order)) return !depositPaid(order);
  return false;
}

// Libellé du moyen de paiement d'une commande (tableau de bord, reçus).
export function paymentLabel(order) {
  if (order?.payment_method === 'ON_DELIVERY') return 'À la livraison';
  if (isDeposit(order)) return 'Acompte + livraison';
  const channel = MOBILE_CHANNELS.find((c) => c.id === order?.payment_channel);
  if (channel) return channel.label;
  return order?.payment_method === 'MOBILE_MONEY' ? 'Paiement mobile' : 'Autre';
}
