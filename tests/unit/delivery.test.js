// Espace livreur : gain par course, espèces, bilan de la journée, libellés de temps.
import { describe, it, expect } from 'vitest';
import { cartTotal, deliveryFee, isPrepaid, cashToCollect, itemsCount, daySummary, sinceLabel, clockLabel, orderRef } from '../../src/utils/delivery';
import { orderDirectionsUrl } from '../../src/utils/orderAddress';

const cod = { id: 'a4f2c3d4-0000', total_amount_fcfa: 10500, payment_method: 'ON_DELIVERY', cart_items: [{ price: 4750, quantity: 2 }] };
const paid = { id: 'b1', total_amount_fcfa: 16000, payment_method: 'MOBILE_MONEY', cart_items: [{ price: 15000, quantity: 1 }] };

describe('Gains et espèces du livreur', () => {
  it('calcule le prix des articles et le gain de la livraison', () => {
    expect(cartTotal(cod)).toBe(9500);
    expect(deliveryFee(cod)).toBe(1000);
    expect(deliveryFee({ total_amount_fcfa: 5000, cart_items: [{ price: 6000, quantity: 1 }] })).toBe(0);
  });

  it('n’encaisse rien pour une commande payée en ligne', () => {
    expect(isPrepaid(paid)).toBe(true);
    expect(cashToCollect(paid)).toBe(0);
    expect(cashToCollect(cod)).toBe(10500);
  });

  it('compte les articles du colis', () => {
    expect(itemsCount(cod)).toBe(2);
    expect(itemsCount({ cart_items: [{ quantity: 1 }, { quantity: 3 }] })).toBe(4);
    expect(itemsCount({})).toBe(1);
  });

  it('fait le bilan de caisse de la journée', () => {
    expect(daySummary([cod, paid])).toEqual({ count: 2, cash: 10500, fees: 2000, toReturn: 8500 });
    expect(daySummary([paid])).toEqual({ count: 1, cash: 0, fees: 1000, toReturn: -1000 });
    expect(daySummary(null)).toEqual({ count: 0, cash: 0, fees: 0, toReturn: 0 });
  });
});

describe('Libellés', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  it('dit depuis combien de temps', () => {
    expect(sinceLabel('2026-11-14T11:59:40Z', now)).toBe("à l'instant");
    expect(sinceLabel('2026-11-14T11:48:00Z', now)).toBe('il y a 12 min');
    expect(sinceLabel('2026-11-14T09:30:00Z', now)).toBe('il y a 2 h');
    expect(sinceLabel('2026-11-13T09:00:00Z', now)).toBe('hier');
    expect(sinceLabel('2026-11-10T09:00:00Z', now)).toBe('il y a 4 j');
    expect(sinceLabel(null, now)).toBe('');
  });

  it('donne l’heure de Dakar et la référence courte', () => {
    expect(clockLabel('2026-11-14T14:05:00Z')).toBe('14:05');
    expect(orderRef(cod)).toBe('A4F2C');
  });

  it('prépare l’itinéraire jusqu’au client', () => {
    expect(orderDirectionsUrl({ customer_address: 'Médina, rue 11 || GPS: https://www.google.com/maps/search/?api=1&query=14.6928,-17.4467' }))
      .toBe('https://www.google.com/maps/dir/?api=1&destination=14.6928%2C-17.4467&travelmode=driving');
    expect(orderDirectionsUrl({ customer_address: 'Sicap Liberté 6, villa 412', delivery_zone: 'Dakar' }))
      .toBe('https://www.google.com/maps/dir/?api=1&destination=Sicap%20Libert%C3%A9%206%2C%20villa%20412%2C%20Dakar&travelmode=driving');
  });
});
