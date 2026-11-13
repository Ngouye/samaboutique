// Options (à choisir) et caractéristiques (à afficher) d'un produit de la vitrine.
import { describe, it, expect } from 'vitest';
import { productOptions, needsChoice } from '../../src/utils/productOptions';

describe('productOptions', () => {
  it('caractéristiques du tableau de bord : affichées, jamais proposées comme choix', () => {
    const p = { variants: ['Matière: Lin', 'Couleur: Blanc cassé', 'Lien: https://exemple.sn/a'] };
    const o = productOptions(p);
    expect(o.features).toEqual([['Matière', 'Lin'], ['Couleur', 'Blanc cassé'], ['Lien', 'https://exemple.sn/a']]);
    expect(o.sizes).toEqual([]);
    expect(needsChoice(p)).toBe(false);
  });

  it('tailles et couleurs (ancien format objet) : à choisir', () => {
    const p = { variants: { sizes: ['S', 'M'], colors: ['Noir'] } };
    expect(productOptions(p)).toMatchObject({ sizes: ['S', 'M'], colors: ['Noir'], features: [] });
    expect(needsChoice(p)).toBe(true);
  });

  it('ancienne liste simple : options à choisir', () => {
    const p = { variants: ['S', 'M', 'L'] };
    expect(productOptions(p)).toMatchObject({ sizes: ['S', 'M', 'L'], legacyList: true });
    expect(needsChoice(p)).toBe(true);
  });

  it('sans variantes, objet vide ou valeurs abîmées : rien à choisir', () => {
    for (const variants of [null, undefined, {}, { sizes: [], colors: [] }, [], ['', '  ', 42], ['Matière:'], { sizes: 'S' }]) {
      expect(needsChoice({ variants })).toBe(false);
    }
    expect(productOptions(null).features).toEqual([]);
  });
});
