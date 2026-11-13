// Adresse et position GPS d'une commande : lecture sûre du texte saisi par le client.
import { describe, it, expect } from 'vitest';
import { parseOrderAddress, orderMapsUrl } from '../../src/utils/orderAddress';

describe('Adresse de livraison', () => {
  it('sépare l’adresse et la position GPS partagée depuis la vitrine', () => {
    const raw = 'Médina, rue 11 || GPS: https://www.google.com/maps/search/?api=1&query=14.6937,-17.4441';
    expect(parseOrderAddress(raw)).toEqual({ address: 'Médina, rue 11', coords: { lat: 14.6937, lng: -17.4441 } });
    expect(orderMapsUrl({ customer_address: raw })).toBe('https://www.google.com/maps/search/?api=1&query=14.6937,-17.4441');
  });

  it('sans position GPS, l’itinéraire cherche l’adresse et la zone', () => {
    expect(parseOrderAddress('Sicap Liberté 6')).toEqual({ address: 'Sicap Liberté 6', coords: null });
    expect(orderMapsUrl({ customer_address: 'Sicap Liberté 6', delivery_zone: 'Dakar Plateau / Médina' }))
      .toBe('https://www.google.com/maps/search/?api=1&query=Sicap%20Libert%C3%A9%206%2C%20Dakar%20Plateau%20%2F%20M%C3%A9dina');
  });

  it('n’ouvre jamais un lien fourni par le client', () => {
    for (const bad of ['javascript:alert(1)', 'https://site-pirate.test/connexion', 'data:text/html,<script>alert(1)</script>']) {
      const order = { customer_address: `Ouakam || GPS: ${bad}`, delivery_zone: 'Almadies' };
      expect(parseOrderAddress(order.customer_address).coords).toBeNull();
      expect(orderMapsUrl(order)).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Ouakam%2C%20Almadies$/);
    }
    // Coordonnées impossibles : ignorées
    expect(parseOrderAddress('X || GPS: 95.1,-200.5').coords).toBeNull();
  });

  it('accepte une adresse vide', () => {
    expect(parseOrderAddress(null)).toEqual({ address: '', coords: null });
  });
});
