// Administration : filtres et résumés des commandes, clients, produits, paiements ; export CSV.
import { describe, it, expect } from 'vitest';
import { filterOrders, ordersSummary, customersSummary, productsSummary, paymentsSummary, toCsv, shortRef } from '../../src/utils/adminData';

const now = Date.parse('2026-11-14T12:00:00Z');
const day = (d) => new Date(now - d * 864e5).toISOString();
const ORDERS = [
  { id: 'a4f2c3d4-1', created_at: day(1), status: 'DELIVERED', total_amount_fcfa: 20000, payment_method: 'ON_DELIVERY', shop_name: 'Chez Awa', merchant_id: 'm1', customer_name: 'Fatou', customer_phone: '77 123 45 67' },
  { id: 'b5e1d2c3-2', created_at: day(3), status: 'DELIVERED', total_amount_fcfa: 10000, payment_method: 'MOBILE_MONEY', payment_channel: 'wave', shop_name: 'Maison Diouf', merchant_id: 'm2', customer_name: 'Moussa' },
  { id: 'c6f7a8b9-3', created_at: day(5), status: 'CANCELLED', total_amount_fcfa: 5000, payment_method: 'ON_DELIVERY', shop_name: 'Chez Awa', merchant_id: 'm1', customer_name: 'Awa' },
  { id: 'd1e2f3a4-4', created_at: day(40), status: 'PENDING', total_amount_fcfa: 7000, payment_method: 'ON_DELIVERY', shop_name: 'Chez Awa', merchant_id: 'm1', customer_name: 'Ibou' },
];

describe('Commandes', () => {
  it('filtre par période, statut, paiement, boutique et recherche', () => {
    expect(filterOrders(ORDERS, { days: 30 }, now)).toHaveLength(3);
    expect(filterOrders(ORDERS, { status: 'DELIVERED' }, now)).toHaveLength(2);
    expect(filterOrders(ORDERS, { status: 'active' }, now).map((o) => o.customer_name)).toEqual(['Ibou']);
    expect(filterOrders(ORDERS, { payment: 'online' }, now).map((o) => o.customer_name)).toEqual(['Moussa']);
    expect(filterOrders(ORDERS, { shop: 'm2' }, now)).toHaveLength(1);
    expect(filterOrders(ORDERS, { q: 'fatou' }, now)).toHaveLength(1);
    expect(filterOrders(ORDERS, { q: 'B5E1' }, now)).toHaveLength(1);
  });

  it('résume l’activité', () => {
    const s = ordersSummary(ORDERS);
    expect(s.gmv).toBe(30000);
    expect(s.avgBasket).toBe(15000);
    expect(s.deliveryRate).toBeCloseTo(2 / 3);
    expect(s.inProgress).toBe(1);
    expect(s.onlineShare).toBe(0.25);
    expect(s.payments[0]).toEqual({ label: 'À la livraison', value: 3, amount: 32000 });
    expect(ordersSummary([]).deliveryRate).toBeNull();
  });
});

describe('Clients, produits, paiements', () => {
  it('résume les clients', () => {
    const s = customersSummary([
      { orders_count: 3, total_spent_fcfa: 30000, first_order_at: day(100), shops_count: 2 },
      { orders_count: 1, total_spent_fcfa: 10000, first_order_at: day(10), shops_count: 1 },
      { orders_count: 1, total_spent_fcfa: 0, first_order_at: day(2), shops_count: 1 },
    ], now);
    expect(s).toEqual({ total: 3, repeat: 1, repeatRate: 1 / 3, newLast30: 2, avgSpent: 20000, multiShop: 1 });
  });

  it('résume les produits', () => {
    const s = productsSummary([
      { name: 'Robe', category: 'Vêtements', stock: 0, units_sold: 5, revenue_fcfa: 90000, shop_name: 'Chez Awa' },
      { name: 'Sac', category: 'Accessoires', stock: 3, units_sold: 0, visibility: 'draft' },
      { name: 'Montre', category: 'Vêtements', stock: 10, units_sold: 2, visibility: 'scheduled', publish_at: day(-1) },
    ], now);
    expect([s.total, s.live, s.draft, s.scheduled, s.outOfStock, s.lowStock, s.neverSold, s.unitsSold]).toEqual([3, 1, 1, 1, 1, 1, 1, 7]);
    expect(s.categories[0]).toEqual({ label: 'Vêtements', value: 2 });
    expect(s.topSold.map((p) => p.label)).toEqual(['Robe', 'Montre']);
  });

  it('résume les paiements d’abonnement', () => {
    expect(paymentsSummary([{ plan: 'pro', amount_fcfa: 5000, created_at: day(3) }, { plan: 'premium', amount_fcfa: 15000, created_at: day(60) }], now))
      .toEqual({ count: 2, total: 20000, last30: 5000, byPlan: { pro: 5000, premium: 15000 } });
  });
});

describe('Export', () => {
  it('produit un CSV compatible Excel', () => {
    const csv = toCsv([['Nom', (r) => r.name], ['Note', (r) => r.note]], [{ name: 'Chez "Awa"', note: 'ok;oui' }]);
    expect(csv).toBe('﻿"Nom";"Note"\n"Chez ""Awa""";"ok;oui"');
    expect(shortRef('a4f2c3d4-0000')).toBe('A4F2C3D4');
  });
});
