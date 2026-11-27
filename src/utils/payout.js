// Comptes sur lesquels le commerçant reçoit l'argent de ses ventes (Paramètres > Réception des paiements).
// Il peut en cocher plusieurs : ils sont enregistrés dans merchants.payout_provider, séparés par des virgules
// (« WAVE,ORANGE_MONEY »). Le reversement automatique utilise le numéro (payout_phone_number) ; la liste
// indique à l'administration les comptes disponibles si un reversement doit être fait à la main.
export const PAYOUT_PROVIDERS = [
  { id: 'WAVE', label: 'Wave', color: 'bg-sky-400' },
  { id: 'ORANGE_MONEY', label: 'Orange Money', color: 'bg-orange-500' },
  { id: 'FREE_MONEY', label: 'Free Money', color: 'bg-red-500' },
];

const ALIASES = { WAVE: 'WAVE', ORANGE_MONEY: 'ORANGE_MONEY', ORANGE: 'ORANGE_MONEY', OM: 'ORANGE_MONEY', FREE_MONEY: 'FREE_MONEY', FREE: 'FREE_MONEY' };

// « wave, orange_money » → ['WAVE', 'ORANGE_MONEY'] (ordre de la liste, sans doublon ni valeur inconnue)
export function parsePayoutProviders(value) {
  const wanted = new Set(
    String(value || '')
      .split(/[,;+]/)
      .map((v) => ALIASES[v.trim().toUpperCase().replace(/[\s-]+/g, '_')])
      .filter(Boolean),
  );
  return PAYOUT_PROVIDERS.map((p) => p.id).filter((id) => wanted.has(id));
}

export const serializePayoutProviders = (ids) => parsePayoutProviders((ids || []).join(',')).join(',');

// ['WAVE', 'ORANGE_MONEY'] ou « WAVE,ORANGE_MONEY » → « Wave + Orange Money »
export function formatPayoutProviders(value) {
  const ids = Array.isArray(value) ? parsePayoutProviders(value.join(',')) : parsePayoutProviders(value);
  return ids.map((id) => PAYOUT_PROVIDERS.find((p) => p.id === id).label).join(' + ');
}
