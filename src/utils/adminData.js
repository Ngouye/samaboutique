// Calculs de l'administration de la plateforme (commandes, clients, produits, paiements).
import { paymentLabel } from './payments';
import { productState } from './productVisibility';

export const DAY = 864e5;
const n = (v) => Number(v) || 0;
const t = (d) => Date.parse(d || '') || 0;

export const shortRef = (id) => String(id || '').slice(0, 8).toUpperCase();
export const isOnline = (o) => o?.payment_method === 'MOBILE_MONEY';
const IN_PROGRESS = ['PENDING', 'PREPARING', 'IN_TRANSIT'];

// Commandes filtrées : période (jours), statut, paiement (« cod » / « online »), boutique, recherche.
export function filterOrders(orders, { status = 'all', payment = 'all', days = 0, q = '', shop = null } = {}, now = Date.now()) {
  const query = q.trim().toLowerCase();
  return (orders || []).filter((o) => {
    if (days && now - t(o.created_at) > days * DAY) return false;
    if (status === 'active' ? !IN_PROGRESS.includes(o.status) : status !== 'all' && o.status !== status) return false;
    if (payment === 'cod' && isOnline(o)) return false;
    if (payment === 'online' && !isOnline(o)) return false;
    if (shop && o.merchant_id !== shop) return false;
    if (query) {
      const hay = `${o.customer_name || ''} ${o.customer_phone || ''} ${o.customer_key || ''} ${o.shop_name || ''} ${shortRef(o.id)} ${o.delivery_zone || ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export function ordersSummary(orders) {
  const list = orders || [];
  const byStatus = {};
  list.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
  const delivered = list.filter((o) => o.status === 'DELIVERED');
  const gmv = delivered.reduce((s, o) => s + n(o.total_amount_fcfa), 0);
  const closed = delivered.length + (byStatus.CANCELLED || 0);
  const pay = new Map();
  list.forEach((o) => {
    const label = paymentLabel(o);
    const cur = pay.get(label) || { label, value: 0, amount: 0 };
    cur.value += 1;
    cur.amount += n(o.total_amount_fcfa);
    pay.set(label, cur);
  });
  return {
    count: list.length,
    byStatus,
    delivered: delivered.length,
    inProgress: IN_PROGRESS.reduce((s, k) => s + (byStatus[k] || 0), 0),
    gmv,
    avgBasket: delivered.length ? Math.round(gmv / delivered.length) : 0,
    deliveryRate: closed ? delivered.length / closed : null,
    onlineShare: list.length ? list.filter(isOnline).length / list.length : 0,
    payments: [...pay.values()].sort((a, b) => b.value - a.value),
  };
}

export function customersSummary(customers, now = Date.now()) {
  const list = customers || [];
  const buyers = list.filter((c) => n(c.total_spent_fcfa) > 0);
  const repeat = list.filter((c) => n(c.orders_count) >= 2).length;
  return {
    total: list.length,
    repeat,
    repeatRate: list.length ? repeat / list.length : 0,
    newLast30: list.filter((c) => now - t(c.first_order_at) <= 30 * DAY).length,
    avgSpent: buyers.length ? Math.round(buyers.reduce((s, c) => s + n(c.total_spent_fcfa), 0) / buyers.length) : 0,
    multiShop: list.filter((c) => n(c.shops_count) >= 2).length,
  };
}

export function productsSummary(products, now = Date.now()) {
  const list = products || [];
  const states = { live: 0, draft: 0, scheduled: 0 };
  const cats = new Map();
  list.forEach((p) => {
    states[productState(p, now)] += 1;
    const c = p.category || 'Sans catégorie';
    cats.set(c, (cats.get(c) || 0) + 1);
  });
  return {
    total: list.length,
    ...states,
    outOfStock: list.filter((p) => n(p.stock) <= 0).length,
    lowStock: list.filter((p) => n(p.stock) > 0 && n(p.stock) <= 5).length,
    neverSold: list.filter((p) => n(p.units_sold) === 0).length,
    unitsSold: list.reduce((s, p) => s + n(p.units_sold), 0),
    categories: [...cats.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8),
    topSold: [...list].filter((p) => n(p.units_sold) > 0).sort((a, b) => n(b.units_sold) - n(a.units_sold)).slice(0, 8)
      .map((p) => ({ label: p.name, value: n(p.units_sold), shop: p.shop_name, revenue: n(p.revenue_fcfa) })),
  };
}

export function paymentsSummary(payments, now = Date.now()) {
  const list = payments || [];
  const byPlan = {};
  list.forEach((p) => { byPlan[p.plan] = (byPlan[p.plan] || 0) + n(p.amount_fcfa); });
  return {
    count: list.length,
    total: list.reduce((s, p) => s + n(p.amount_fcfa), 0),
    last30: list.filter((p) => now - t(p.created_at) <= 30 * DAY).reduce((s, p) => s + n(p.amount_fcfa), 0),
    byPlan,
  };
}

// Tableau CSV (séparateur « ; » pour Excel en français), avec BOM pour les accents.
export function toCsv(columns, rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '﻿' + [columns.map(([h]) => cell(h)).join(';'), ...rows.map((r) => columns.map(([, get]) => cell(get(r))).join(';'))].join('\n');
}

// Clients d'une seule boutique, recalculés à partir de ses commandes : aucun chiffre ne mélange
// ce qu'un client a acheté ailleurs.
export function customersFromOrders(orders) {
  const groups = new Map();
  (orders || []).forEach((o) => {
    const key = o.customer_key || '';
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  return [...groups.entries()].map(([key, list]) => {
    const sorted = [...list].sort((a, b) => t(b.created_at) - t(a.created_at));
    const delivered = sorted.filter((o) => o.status === 'DELIVERED');
    return {
      customer_key: key,
      customer_name: sorted[0].customer_name,
      customer_phone: sorted[0].customer_phone,
      orders_count: sorted.length,
      delivered_count: delivered.length,
      cancelled_count: sorted.filter((o) => o.status === 'CANCELLED').length,
      total_spent_fcfa: delivered.reduce((s, o) => s + n(o.total_amount_fcfa), 0),
      shops_count: new Set(sorted.map((o) => o.merchant_id)).size,
      shops: [...new Set(sorted.map((o) => o.shop_name).filter(Boolean))].slice(0, 5),
      zones: [...new Set(sorted.map((o) => o.delivery_zone).filter(Boolean))].slice(0, 5),
      first_order_at: sorted[sorted.length - 1].created_at,
      last_order_at: sorted[0].created_at,
    };
  }).sort((a, b) => t(b.last_order_at) - t(a.last_order_at));
}

// Données d'une seule boutique (ou de toute la plateforme si `merchantId` vaut 'all').
export function scopeData(extra, merchantId) {
  if (!merchantId || merchantId === 'all') return extra;
  const mine = (x) => x.merchant_id === merchantId;
  const orders = (extra.orders || []).filter(mine);
  return {
    ...extra,
    orders,
    customers: customersFromOrders(orders),
    products: (extra.products || []).filter(mine),
    drivers: (extra.drivers || []).filter(mine),
    reviews: (extra.reviews || []).filter(mine),
    payments: (extra.payments || []).filter(mine),
  };
}
