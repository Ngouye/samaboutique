// Retour dans l'application mobile après un paiement PayDunya (page /retour-app du site).
// Seules les adresses d'application sont suivies (samaboutik://… application installée, exp://… tests Expo Go) :
// la page ne peut jamais servir à rediriger vers un site extérieur. Même règle que server/routes/payment.js.
export const APP_RETURN_URL = /^(samaboutik|exps?):\/\/[^\s"'<>]{1,300}$/i;

export const appReturnStatus = (search) => (new URLSearchParams(search).get('statut') === 'annule' ? 'annule' : 'paye');

// Adresse de l'application à ouvrir, avec le numéro de commande et l'état du paiement ; null si le lien est invalide.
export function appReturnTarget(search) {
  const params = new URLSearchParams(search);
  const to = params.get('to') || '';
  if (!APP_RETURN_URL.test(to)) return null;
  const commande = (params.get('commande') || '').replace(/[^0-9a-f-]/gi, '').slice(0, 36);
  const separator = to.includes('?') ? '&' : '?';
  return `${to}${separator}commande=${encodeURIComponent(commande)}&statut=${appReturnStatus(search)}`;
}
