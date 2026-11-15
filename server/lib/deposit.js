// Acompte du paiement à la livraison : 10 % du total (articles + livraison), payé en ligne,
// arrondi aux 5 F supérieurs pour que le reste à payer en espèces soit rendable.
// Même calcul en base (acompte_livraison.sql, order_deposit) et sur le site (src/utils/payments.js).
export const DEPOSIT_PERCENT = 10;

export function depositFor(total) {
  const t = Math.max(0, Math.round(Number(total) || 0));
  return Math.min(t, Math.ceil(t / 50) * 5);
}

// Acompte d'une commande et reste à payer au livreur.
export function depositSplit(order) {
  const total = Math.max(0, Number(order?.total_amount_fcfa) || 0);
  const deposit = Number(order?.payment_deposit_amount) || depositFor(total);
  return { total, deposit, balance: Math.max(0, total - deposit) };
}
