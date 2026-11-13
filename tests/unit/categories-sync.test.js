// Le serveur (assistant IA) et le site doivent proposer exactement les mêmes catégories et caractéristiques.
import { describe, it, expect } from 'vitest';
import { SHOP_CATEGORIES, CATEGORY_FEATURES } from '../../src/utils/categories';
import { CATEGORY_FEATURES as SERVER_FEATURES, CATEGORY_NAMES } from '../../server/lib/productCategories.js';

describe('Catégories de produits', () => {
  it('identiques sur le site et sur le serveur', () => {
    expect(CATEGORY_NAMES).toEqual(SHOP_CATEGORIES.map((c) => c.name));
    expect(SERVER_FEATURES).toEqual(CATEGORY_FEATURES);
  });
});
