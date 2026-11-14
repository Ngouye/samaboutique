// Produits : brouillon, programmé, en ligne ; vérifications avant publication.
import { describe, it, expect } from 'vitest';
import { productState, isLive, publishChecklist, missingEssentials, toLocalInput, defaultSchedule, scheduleError, visibilityPayload, visibilityChoice } from '../../src/utils/productVisibility';

const now = Date.parse('2026-11-14T12:00:00Z');

describe('État d’un produit', () => {
  it('est en ligne sans colonne de visibilité (base pas encore mise à jour)', () => {
    expect(productState({ name: 'Ancien' }, now)).toBe('live');
    expect(isLive({ visibility: 'published' }, now)).toBe(true);
  });

  it('reconnaît les brouillons et les produits programmés', () => {
    expect(productState({ visibility: 'draft' }, now)).toBe('draft');
    expect(productState({ visibility: 'scheduled', publish_at: '2026-11-15T09:00:00Z' }, now)).toBe('scheduled');
    expect(productState({ visibility: 'scheduled', publish_at: '2026-11-14T11:00:00Z' }, now)).toBe('live');
    expect(productState({ visibility: 'scheduled', publish_at: null }, now)).toBe('scheduled');
  });
});

describe('Avant publication', () => {
  it('liste ce qui manque, essentiels d’abord', () => {
    const list = publishChecklist({ price_fcfa: 0, description: 'court', stock: 0, category: '' });
    expect(list.filter((c) => !c.ok).map((c) => c.id)).toEqual(['photo', 'price', 'description', 'stock', 'category']);
    expect(missingEssentials(list).map((c) => c.id)).toEqual(['photo', 'price']);
  });

  it('valide un produit complet', () => {
    const list = publishChecklist({ image_url: 'https://x/y.jpg', price_fcfa: 5000, description: 'Sac cabas tressé à la main, grand format.', stock: 3, category: 'Accessoires' });
    expect(list.every((c) => c.ok)).toBe(true);
    expect(publishChecklist({}, { hasImage: true })[0].ok).toBe(true);
  });
});

describe('Programmation', () => {
  it('prépare et vérifie la date', () => {
    expect(toLocalInput(new Date(2026, 10, 15, 9, 5))).toBe('2026-11-15T09:05');
    expect(defaultSchedule(new Date(2026, 10, 14, 18, 30).getTime())).toBe('2026-11-15T09:00');
    expect(scheduleError('', now)).toMatch(/Choisissez la date/);
    expect(scheduleError(toLocalInput(now - 3600e3), now)).toMatch(/heure à venir/);
    expect(scheduleError(toLocalInput(now + 2 * 3600e3), now)).toBe('');
  });

  it('enregistre le bon choix', () => {
    expect(visibilityPayload('draft', '', null, now)).toEqual({ visibility: 'draft', publish_at: null });
    const local = toLocalInput(now + 86400e3);
    expect(visibilityPayload('scheduled', local, null, now)).toEqual({ visibility: 'scheduled', publish_at: new Date(local).toISOString() });
    expect(visibilityPayload('published', '', { visibility: 'draft' }, now)).toEqual({ visibility: 'published', publish_at: null, published_at: '2026-11-14T12:00:00.000Z' });
    // Déjà en ligne : la date de première publication est gardée
    expect(visibilityPayload('published', '', { visibility: 'published', published_at: '2026-10-01T08:00:00Z' }, now).published_at).toBe('2026-10-01T08:00:00Z');
  });

  it('retrouve le choix d’un produit existant', () => {
    expect(visibilityChoice({ visibility: 'draft' })).toBe('draft');
    expect(visibilityChoice({ visibility: 'scheduled' })).toBe('scheduled');
    expect(visibilityChoice({})).toBe('published');
  });
});
