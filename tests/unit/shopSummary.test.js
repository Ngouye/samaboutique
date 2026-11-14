// Annuaire : description d'une boutique (la sienne, ou une phrase faite de faits réels).
import { describe, it, expect } from 'vitest';
import { shopSummary, shopPlace, isNewShop, joinFr } from '../../src/utils/shopSummary';

const base = { shop_name: 'Boutique Pro Dakar', city: 'Dakar', categories: ['Chaussures', 'Costume', 'Vêtements'], products_count: 9, min_price_fcfa: 8000 };

describe('shopSummary', () => {
  it('garde la description écrite par le commerçant', () => {
    expect(shopSummary({ ...base, description: '  Prêt-à-porter   homme et femme, retouches sur place.  ' }))
      .toEqual({ text: 'Prêt-à-porter homme et femme, retouches sur place.', generated: false });
  });

  it('construit une phrase à partir des faits quand il n’y a pas de description', () => {
    const { text, generated } = shopSummary({ ...base, description: null });
    expect(generated).toBe(true);
    expect(text).toBe('Boutique en ligne à Dakar : chaussures, costume et vêtements. 9 articles disponibles, à partir de 8 000 FCFA. Commandez directement sur sa vitrine.');
  });

  it('ajoute les avis et WhatsApp seulement s’ils existent', () => {
    const { text } = shopSummary({ ...base, rating: 4.75, reviews_count: 12, whatsapp: '221771234567' });
    expect(text).toContain('Noté 4,8/5 par 12 clients.');
    expect(text).toContain('écrivez-lui sur WhatsApp');
    expect(shopSummary({ ...base, rating: 0, reviews_count: 0 }).text).not.toContain('Noté');
  });

  it('reste correct avec peu d’informations', () => {
    expect(shopSummary({ city: 'Sénégal', products_count: 1 }).text)
      .toBe('Boutique en ligne au Sénégal. 1 article disponible. Commandez directement sur sa vitrine.');
    expect(shopSummary({ description: 'Top' }).generated).toBe(true);
  });
});

describe('shopPlace, isNewShop, joinFr', () => {
  it('assemble adresse et ville sans doublon', () => {
    expect(shopPlace({ address: 'Médina, rue 11', city: 'Dakar' })).toBe('Médina, rue 11, Dakar');
    expect(shopPlace({ address: 'Plateau, Dakar', city: 'Dakar' })).toBe('Plateau, Dakar');
    expect(shopPlace({ city: 'Thiès' })).toBe('Thiès');
    expect(shopPlace({})).toBe('Sénégal');
  });

  it('repère une boutique récente sans avis', () => {
    const now = Date.parse('2026-11-14T12:00:00Z');
    expect(isNewShop({ created_at: '2026-11-01T00:00:00Z' }, now)).toBe(true);
    expect(isNewShop({ created_at: '2026-11-01T00:00:00Z', reviews_count: 2 }, now)).toBe(false);
    expect(isNewShop({ created_at: '2026-08-01T00:00:00Z' }, now)).toBe(false);
    expect(isNewShop({}, now)).toBe(false);
  });

  it('joint une liste en français', () => {
    expect(joinFr(['a'])).toBe('a');
    expect(joinFr(['a', 'b'])).toBe('a et b');
    expect(joinFr(['a', 'b', 'c'])).toBe('a, b et c');
  });
});
