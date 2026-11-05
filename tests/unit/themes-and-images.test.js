// Thèmes de vitrine (lisibilité des couleurs) et photos (miniatures, tailles).
import { describe, it, expect } from 'vitest';
import { SHOP_THEMES, getShopTheme, themeStyle } from '../../src/components/shop/themes';
import { thumbUrl, formatBytes, savingsMessage } from '../../src/utils/imageUpload';

// Contraste WCAG entre deux couleurs hexadécimales.
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const SURFACE = { minuit: '#151517', terracotta: '#fffdfa' };
const PANEL = { emeraude: '#0b1f17', minuit: '#050505', terracotta: '#3b1d12', ocean: '#0c2340', rose: '#3f1d2b', epure: '#0a0a0a' };
const CUSTOM_COLORS = ['#facc15', '#ffffff', '#000000', '#22d3ee', '#7c3aed', '#ff6b00'];

describe('Thèmes de vitrine', () => {
  it('propose 6 thèmes et retombe sur Émeraude pour les anciens styles', () => {
    expect(SHOP_THEMES.map((t) => t.id)).toEqual(['emeraude', 'minuit', 'terracotta', 'ocean', 'rose', 'epure']);
    expect(getShopTheme('modern').id).toBe('emeraude');
    expect(getShopTheme(null).id).toBe('emeraude');
    expect(getShopTheme('minuit').name).toBe('Minuit');
  });

  for (const theme of SHOP_THEMES) {
    for (const color of [theme.accent, ...CUSTOM_COLORS]) {
      it(`${theme.name} + ${color} : textes lisibles partout`, () => {
        const vars = themeStyle(theme, color);
        // Texte posé sur la couleur principale (boutons)
        expect(contrast(vars['--shop'], vars['--shop-on'])).toBeGreaterThanOrEqual(3);
        // Couleur principale utilisée comme texte sur les cartes
        expect(contrast(vars['--shop-accent-text'], SURFACE[theme.id] || '#ffffff')).toBeGreaterThanOrEqual(3);
        // Sur les bandeaux sombres (suivi, pied de page)
        expect(contrast(vars['--shop-panel-accent'], PANEL[theme.id])).toBeGreaterThanOrEqual(3);
        expect(contrast(vars['--shop-panel-accent'], vars['--shop-panel-on'])).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it('ignore une couleur invalide', () => {
    expect(themeStyle(getShopTheme('ocean'), 'pas-une-couleur')['--shop']).toBe('#0284c7');
  });
});

describe('Photos', () => {
  const base = 'https://x.supabase.co/storage/v1/object/public/product-images/m1/';
  it('trouve la miniature des photos envoyées avec la nouvelle version', () => {
    expect(thumbUrl(`${base}3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab.webp`)).toBe(`${base}3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab.thumb.webp`);
  });
  it('garde l’adresse d’origine pour les anciennes photos, logos et bannières', () => {
    expect(thumbUrl(`${base}0.123456.jpg`)).toBe(`${base}0.123456.jpg`);
    expect(thumbUrl(`${base}logo_3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab.webp`)).toBe(`${base}logo_3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab.webp`);
    expect(thumbUrl(null)).toBeNull();
  });
  it('affiche les tailles en Ko / Mo et le gain obtenu', () => {
    expect(formatBytes(180 * 1024)).toBe('180 Ko');
    expect(formatBytes(2.4 * 1024 * 1024)).toMatch(/^2,4\s?Mo$/);
    expect(savingsMessage({ before: 2_000_000, after: 200_000 })).toMatch(/^Photo allégée/);
    expect(savingsMessage({ before: 100_000, after: 95_000 })).toBeNull();
  });
});
