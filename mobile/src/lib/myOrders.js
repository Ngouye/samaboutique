// « Mes commandes » : commandes passées depuis ce téléphone, retrouvées avec le téléphone et le code
// de livraison (même suivi que le site : fonction track_order, tolérante aux écritures du numéro).
import { supabase, configError } from './supabase';
import { store } from './storage';

const KEY = 'orders';
const MAX = 30;

export const listOrders = () => store.get(KEY, []);

// Enregistre (ou met à jour) une commande à partir de son reçu.
export function saveOrder(receipt, shopName) {
  if (!receipt?.id || !receipt.delivery_pin || !receipt.customer_phone) return;
  const items = (receipt.cart_items || []).reduce((n, it) => n + (Number(it.quantity) || 0), 0);
  const entry = {
    id: String(receipt.id),
    shop: shopName,
    phone: receipt.customer_phone,
    pin: receipt.delivery_pin,
    total: Number(receipt.total_amount_fcfa) || 0,
    items,
    at: receipt.created_at || new Date().toISOString(),
  };
  const rest = listOrders().filter((o) => o.id !== entry.id);
  store.set(KEY, [entry, ...rest].slice(0, MAX));
}

export function removeOrder(id) {
  store.set(KEY, listOrders().filter((o) => o.id !== String(id)));
}

export const findOrder = (id) => listOrders().find((o) => o.id === String(id)) || null;

// État à jour d'une commande enregistrée : { ok: true, order } ou { ok: false, error }.
export async function trackOrder(entry) {
  if (configError) return { ok: false, error: configError };
  const { data, error } = await supabase.rpc('track_order', { p_phone: entry.phone, p_pin: entry.pin });
  if (error) return { ok: false, error: /fetch|network/i.test(error.message || '') ? 'Pas de connexion internet.' : 'Suivi momentanément indisponible.' };
  return data?.ok ? { ok: true, order: data.order } : { ok: false, error: data?.error || 'Commande introuvable.' };
}

// Historique simplifié de la commande (livraisons_suivi.sql) : liste d'étapes { kind, at, name },
// ou null si indisponible (script pas encore installé, pas de réseau) : l'écran garde alors l'historique déjà affiché.
export async function trackHistory(entry) {
  if (configError) return null;
  try {
    const { data, error } = await supabase.rpc('track_order_history', { p_phone: entry.phone, p_pin: entry.pin });
    if (error || !data?.ok || String(data.order_id) !== String(entry.id)) return null;
    return Array.isArray(data.events) ? data.events : [];
  } catch {
    return null;
  }
}

// « 10 h 02 », « hier · 18 h 30 », « 25/11 · 09 h 15 »
export function clockLabel(iso, now = Date.now()) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())} h ${pad(d.getMinutes())}`;
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date(now)) - day(d)) / 86400000);
  if (diff === 0) return time;
  if (diff === 1) return `hier · ${time}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${time}`;
}

// Libellés des étapes (mêmes étapes que le suivi du site).
export const TRACK_STEPS = [
  { id: 'PENDING', label: 'Reçue', icon: 'clipboard-outline' },
  { id: 'PREPARING', label: 'Préparation', icon: 'cube-outline' },
  { id: 'IN_TRANSIT', label: 'En route', icon: 'bicycle-outline' },
  { id: 'DELIVERED', label: 'Livrée', icon: 'checkmark-done-outline' },
];

// Statut affiché : un paiement en ligne pas encore confirmé passe avant l'étape.
export function statusInfo(order) {
  const unpaid = order?.status === 'PENDING'
    && ['MOBILE_MONEY', 'DEPOSIT'].includes(order?.payment_method)
    && !['PAID', 'DEPOSIT_PAID'].includes(order?.payment_status);
  if (unpaid) return { label: 'Paiement en attente', sub: 'Le paiement en ligne n’est pas encore confirmé.', tone: 'gold', icon: 'time-outline' };
  switch (order?.status) {
    case 'PREPARING': return { label: 'En préparation', sub: 'La boutique prépare votre colis.', tone: 'brand', icon: 'cube-outline' };
    case 'IN_TRANSIT': return { label: 'En route', sub: 'Le livreur arrive avec votre colis.', tone: 'brand', icon: 'bicycle-outline' };
    case 'DELIVERED': return { label: 'Livrée', sub: 'Merci pour votre achat !', tone: 'green', icon: 'checkmark-done-outline' };
    case 'CANCELLED': return { label: 'Annulée', sub: 'Contactez la boutique pour plus de détails.', tone: 'red', icon: 'close-circle-outline' };
    case 'DISPUTED': return { label: 'En litige', sub: 'La boutique examine votre commande.', tone: 'gold', icon: 'alert-circle-outline' };
    default: return { label: 'Commande reçue', sub: 'La boutique va confirmer votre commande.', tone: 'brand', icon: 'clipboard-outline' };
  }
}

// « à l'instant », « il y a 5 min », « il y a 2 h », « hier », « il y a 3 j »
export function sinceLabel(iso, now = Date.now()) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} j`;
}
