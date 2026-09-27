// Calculs du tableau de bord marchand : tout est dérivé des commandes et produits réels.

// Couleurs validées (scripts dataviz, toutes paires, surface blanche) :
// bleu / orange / vert d'eau / violet — CVD ΔE ≥ 9.2, vision normale ΔE ≥ 16.3.
// Le vert d'eau est sous 3:1 : chaque segment est donc toujours étiqueté (valeur + %).
export const STATUS_GROUPS = [
  { id: 'todo', label: 'À traiter', statuses: ['PENDING'], color: '#2a78d6' },
  { id: 'progress', label: 'En cours', statuses: ['PREPARING', 'IN_TRANSIT'], color: '#eb6834' },
  { id: 'done', label: 'Livrées', statuses: ['DELIVERED'], color: '#1baf7a' },
  { id: 'failed', label: 'Annulées / litiges', statuses: ['CANCELLED', 'DISPUTED'], color: '#4a3aa7' },
];

export const CHART_COLORS = {
  revenue: '#059669',
  orders: '#2a78d6',
  products: '#059669',
};

export const PERIODS = [
  { id: 7, label: '7 jours' },
  { id: 30, label: '30 jours' },
  { id: 90, label: '90 jours' },
];

const DAY = 86400000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const createdAt = (o) => new Date(o.created_at).getTime();
// Le chiffre d'affaires est compté au moment de la livraison (date de création à défaut).
const revenueAt = (o) => new Date(o.delivered_at || o.created_at).getTime();
const sumAmount = (list) => list.reduce((acc, o) => acc + (o.total_amount_fcfa || 0), 0);

export const statusGroupOf = (status) => STATUS_GROUPS.find((g) => g.statuses.includes(status)) || STATUS_GROUPS[0];

export const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');

export const compact = (n) => {
  const v = Math.abs(n);
  if (v >= 1e6) return `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (v >= 1e3) return `${(n / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`;
  return fmt(n);
};

// Variation par rapport à la période précédente. null = pas de base de comparaison.
export const delta = (current, previous) => {
  if (!previous) return null;
  return (current - previous) / previous;
};

// Graduations « rondes » pour l'axe Y (0, 5 000, 10 000…).
export function niceTicks(max, count = 4) {
  if (!max || max <= 0) return [0, 1];
  const rough = max / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(t);
  return ticks;
}

function bucketLabels(start, days, periodDays) {
  const d = new Date(start);
  if (days > 1) {
    const endD = new Date(start + (days - 1) * DAY);
    return {
      short: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      long: `Semaine du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endD.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`,
    };
  }
  return {
    short: periodDays <= 7
      ? d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    long: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

export function computeAnalytics(orders, products, periodDays, now = new Date()) {
  const end = startOfDay(now) + DAY; // fin de journée (exclusive)
  const start = end - periodDays * DAY;
  const prevStart = start - periodDays * DAY;
  const within = (t, a, b) => t >= a && t < b;

  const periodOrders = orders.filter((o) => within(createdAt(o), start, end));
  const prevOrders = orders.filter((o) => within(createdAt(o), prevStart, start));
  const delivered = orders.filter((o) => o.status === 'DELIVERED');
  const periodDelivered = delivered.filter((o) => within(revenueAt(o), start, end));
  const prevDelivered = delivered.filter((o) => within(revenueAt(o), prevStart, start));

  const revenue = sumAmount(periodDelivered);
  const prevRevenue = sumAmount(prevDelivered);
  const avgBasket = periodDelivered.length ? revenue / periodDelivered.length : 0;
  const prevAvgBasket = prevDelivered.length ? prevRevenue / prevDelivered.length : 0;
  const rate = (list) => (list.length ? list.filter((o) => o.status === 'DELIVERED').length / list.length : 0);

  // Regroupement par jour (7/30 j) ou par semaine (90 j) pour rester lisible.
  const bucketDays = periodDays > 31 ? 7 : 1;
  const bucketCount = Math.ceil(periodDays / bucketDays);
  const series = Array.from({ length: bucketCount }, (_, i) => {
    const bStart = start + i * bucketDays * DAY;
    const bEnd = Math.min(bStart + bucketDays * DAY, end);
    const labels = bucketLabels(bStart, bEnd - bStart > DAY ? Math.round((bEnd - bStart) / DAY) : 1, periodDays);
    return {
      key: bStart,
      label: labels.short,
      longLabel: labels.long,
      revenue: sumAmount(periodDelivered.filter((o) => within(revenueAt(o), bStart, bEnd))),
      orders: periodOrders.filter((o) => within(createdAt(o), bStart, bEnd)).length,
      delivered: periodDelivered.filter((o) => within(revenueAt(o), bStart, bEnd)).length,
    };
  });

  // Tendances des tuiles : au plus 12 points, en regroupant les intervalles voisins.
  const groups = Math.min(12, series.length);
  const spark = Array.from({ length: groups }, (_, g) => {
    const slice = series.slice(Math.floor((g * series.length) / groups), Math.floor(((g + 1) * series.length) / groups));
    const total = (k) => slice.reduce((acc, b) => acc + b[k], 0);
    return { revenue: total('revenue'), orders: total('orders'), delivered: total('delivered') };
  });

  const statusBreakdown = STATUS_GROUPS.map((g) => ({
    ...g,
    value: periodOrders.filter((o) => g.statuses.includes(o.status)).length,
  }));

  // Meilleurs produits (hors commandes annulées / en litige), classés par chiffre généré.
  const productNames = new Map(products.map((p) => [p.id, p.name]));
  const byProduct = new Map();
  periodOrders
    .filter((o) => !['CANCELLED', 'DISPUTED'].includes(o.status))
    .forEach((o) => {
      (o.cart_items || []).forEach((item) => {
        const key = item.product_id || item.name;
        const entry = byProduct.get(key) || { name: productNames.get(item.product_id) || item.name, quantity: 0, revenue: 0 };
        entry.quantity += item.quantity || 0;
        entry.revenue += (item.price || 0) * (item.quantity || 0);
        byProduct.set(key, entry);
      });
    });
  const topProducts = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return {
    range: { start, end },
    revenue,
    revenueDelta: delta(revenue, prevRevenue),
    ordersCount: periodOrders.length,
    ordersDelta: delta(periodOrders.length, prevOrders.length),
    avgBasket,
    avgBasketDelta: delta(avgBasket, prevAvgBasket),
    deliveryRate: rate(periodOrders),
    deliveryRateDelta: prevOrders.length ? rate(periodOrders) - rate(prevOrders) : null,
    series,
    spark,
    statusBreakdown,
    topProducts,
  };
}
