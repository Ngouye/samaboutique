// Calculs de l'espace livreur : gain par course, espèces à encaisser, bilan de la journée.
// Le gain du livreur est le prix de la livraison : total de la commande moins les articles.

const n = (v) => Number(v) || 0;

export const fmt = (v) => Math.round(v || 0).toLocaleString('fr-FR');

export const cartTotal = (order) =>
  (order?.cart_items || []).reduce((sum, it) => sum + n(it.price) * (n(it.quantity) || 1), 0);

export const deliveryFee = (order) => Math.max(0, n(order?.total_amount_fcfa) - cartTotal(order));

// Payée en ligne (Wave, Orange Money…) : le livreur n'encaisse rien.
export const isPrepaid = (order) => order?.payment_method === 'MOBILE_MONEY';

export const cashToCollect = (order) => (isPrepaid(order) ? 0 : n(order?.total_amount_fcfa));

export const itemsCount = (order) => {
  const items = order?.cart_items || [];
  return items.length ? items.reduce((sum, it) => sum + (n(it.quantity) || 1), 0) : 1;
};

// Bilan de caisse : espèces encaissées, gains du livreur, somme à reverser à la boutique
// (négative quand des courses payées en ligne ont rapporté plus de frais que d'espèces).
export function daySummary(delivered) {
  const list = delivered || [];
  const cash = list.reduce((sum, o) => sum + cashToCollect(o), 0);
  const fees = list.reduce((sum, o) => sum + deliveryFee(o), 0);
  return { count: list.length, cash, fees, toReturn: cash - fees };
}

// « à l'instant », « il y a 12 min », « il y a 2 h », « hier », « il y a 3 j »
export function sinceLabel(iso, now = Date.now()) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} j`;
}

// Heure locale de Dakar : « 14:05 »
export const clockLabel = (iso) => {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });
};

export const orderRef = (order) => String(order?.id || '').slice(0, 5).toUpperCase();
