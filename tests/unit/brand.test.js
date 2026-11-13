// La couleur de la marque est définie dans src/index.css et répétée pour le code dans src/utils/brand.js :
// les deux doivent rester identiques, et aucune couleur de marque ne doit être écrite en dur ailleurs.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BRAND } from '../../src/utils/brand';

const root = path.resolve(__dirname, '../..');
const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
const cssVar = (name) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();

describe('Couleur de la marque', () => {
  it('src/utils/brand.js reprend exactement les valeurs de src/index.css', () => {
    expect(BRAND.signature).toBe(cssVar('brand-700'));
    expect(BRAND.vivid).toBe(cssVar('brand-500'));
    expect(BRAND.light).toBe(cssVar('brand-400'));
    expect(BRAND.ink).toBe(cssVar('ink'));
    expect(BRAND.night).toBe(cssVar('night'));
  });

  it('la barre du navigateur sur téléphone prend la couleur de la marque', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    expect(html).toContain(`<meta name="theme-color" content="${BRAND.ink}" />`);
  });

  it('le logo des onglets et des écrans d’accueil existe et suit la couleur de la marque', () => {
    const favicon = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8');
    expect(favicon.toLowerCase()).toContain(BRAND.signature);
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    for (const file of ['apple-touch-icon.png', 'site.webmanifest', 'og-image.jpg']) {
      expect(html).toContain(`/${file}`);
      expect(fs.existsSync(path.join(root, 'public', file))).toBe(true);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/site.webmanifest'), 'utf8'));
    expect(manifest.theme_color).toBe(BRAND.ink);
    for (const icon of manifest.icons) expect(fs.existsSync(path.join(root, 'public', icon.src))).toBe(true);
  });
});
