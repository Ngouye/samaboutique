// Recherche de la vitrine : accents, majuscules, plusieurs mots, pertinence, tranches de prix.
import { describe, it, expect } from 'vitest';
import { normalize, searchScore, searchProducts, priceBuckets } from '../../src/utils/searchText';

const P = [
  { id: 'a', name: 'Coffret épices du marché', category: 'Épicerie', tags: ['cuisine'], description: 'Poivre, piment' },
  { id: 'b', name: 'Robe wax Teranga', category: 'Vêtements', tags: ['tabaski', 'boubou'], description: 'Coton imprimé' },
  { id: 'c', name: 'Sac cabas tressé', category: 'Accessoires', tags: [], description: 'Idéal pour le marché' },
];

describe('recherche', () => {
  it('ignore accents et majuscules', () => {
    expect(normalize('  ÉPICES Tressé ')).toBe('epices tresse');
    expect(searchProducts(P, 'epices').map((p) => p.id)).toEqual(['a']);
    expect(searchProducts(P, 'TRESSE').map((p) => p.id)).toEqual(['c']);
  });

  it('cherche aussi dans les mots-clés, la catégorie et la description', () => {
    expect(searchProducts(P, 'tabaski').map((p) => p.id)).toEqual(['b']);
    expect(searchProducts(P, 'vetements').map((p) => p.id)).toEqual(['b']);
    expect(searchProducts(P, 'coton').map((p) => p.id)).toEqual(['b']);
  });

  it('chaque mot doit être trouvé, et le nom passe avant la description', () => {
    expect(searchProducts(P, 'robe tabaski').map((p) => p.id)).toEqual(['b']);
    expect(searchProducts(P, 'robe sac')).toEqual([]);
    expect(searchProducts(P, 'marche').map((p) => p.id)).toEqual(['a', 'c']); // nom (a) avant description (c)
  });

  it('recherche vide : tout le catalogue, dans l’ordre', () => {
    expect(searchScore(P[0], '   ')).toBe(1);
    expect(searchProducts(P, '').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('tranches de prix', () => {
  it('trois tranches arrondies', () => {
    const b = priceBuckets([5000, 6000, 7500, 9500, 14000, 18500]);
    // Tiers des prix : 7 500 et 14 000 (arrondi à 15 000). Espaces fines du français remplacées pour comparer.
    expect(b.map((x) => x.label.replace(/\s/g, ' '))).toEqual(['Moins de 7 500 F', '7 500 – 15 000 F', 'Plus de 15 000 F']);
    expect(b[0]).toMatchObject({ min: null, max: 7500 });
    expect(b[2]).toMatchObject({ min: 15000, max: null });
  });

  it('pas de tranches avec trop peu de produits ou des prix identiques', () => {
    expect(priceBuckets([1000, 2000])).toEqual([]);
    expect(priceBuckets([3000, 3000, 3000, 3000])).toEqual([]);
  });
});

describe('filtres', () => {
  it('prix minimum et maximum inclus, disponibilité', async () => {
    const { matchesFilters, activeFilterCount, NO_FILTERS } = await import('../../src/utils/searchText');
    const p = { price_fcfa: 9500, stock: 0 };
    expect(matchesFilters(p, NO_FILTERS)).toBe(true);
    expect(matchesFilters(p, { ...NO_FILTERS, minPrice: 9500, maxPrice: 9500 })).toBe(true);
    expect(matchesFilters(p, { ...NO_FILTERS, maxPrice: 9000 })).toBe(false);
    expect(matchesFilters(p, { ...NO_FILTERS, inStock: true })).toBe(false);
    expect(matchesFilters({ price_fcfa: 100 }, { ...NO_FILTERS, inStock: true })).toBe(true); // stock non suivi
    expect(activeFilterCount({ minPrice: 0, maxPrice: null, inStock: true })).toBe(2);
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
  });
});
