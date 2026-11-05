// Messages d'erreur lisibles et protection des données dans les rapports d'erreur.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { friendlyError, isNetworkError, NETWORK_MESSAGE } from '../../src/utils/networkErrors';
import { authErrorMessage } from '../../src/utils/authErrors';
import { scrubText, scrubUrl, scrubEvent, scrubBreadcrumb, captureError } from '../../src/lib/monitoring';

afterEach(() => vi.unstubAllGlobals());

describe('Messages en cas de coupure réseau', () => {
  it('reconnaît les erreurs réseau des différents navigateurs', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true); // Chrome
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true); // Firefox
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true); // Safari
    expect(isNetworkError({ message: 'Coordonnées invalides.' })).toBe(false);
  });

  it('considère toute erreur comme réseau quand le téléphone est hors ligne', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(friendlyError(new Error('Coordonnées invalides.'))).toBe(NETWORK_MESSAGE);
  });

  it('garde les messages métier lisibles et masque les messages techniques', () => {
    expect(friendlyError(new Error('Trop de commandes en peu de temps. Réessayez plus tard.'))).toBe('Trop de commandes en peu de temps. Réessayez plus tard.');
    expect(friendlyError(new Error('duplicate key value violates unique constraint "orders_pkey"'), 'Repli')).toBe('Repli');
    expect(friendlyError({ message: 'JWT expired' }, 'Repli')).toBe('Repli');
    expect(friendlyError(null, 'Repli')).toBe('Repli');
  });

  it('traduit les erreurs de connexion', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe('Email ou mot de passe incorrect.');
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toBe(NETWORK_MESSAGE);
  });
});

describe('Rapports d’erreur : aucune donnée personnelle', () => {
  it('masque téléphones et e-mails', () => {
    expect(scrubText('Échec pour +221 77 123 45 67 / awa@exemple.sn')).toBe('Échec pour [numéro] / [email]');
    expect(scrubText('771234567')).toBe('[numéro]');
  });

  it('retire les paramètres des adresses (téléphone de suivi, n° de commande)', () => {
    expect(scrubUrl('https://site.sn/boutique/Chez%20Awa?suivi=771234567')).toBe('https://site.sn/boutique/Chez%20Awa');
    expect(scrubUrl('https://site.sn/boutique/x?payment=success&orderId=abc#top')).toBe('https://site.sn/boutique/x');
  });

  it('nettoie un événement complet', () => {
    const event = scrubEvent({
      message: 'Commande de 771234567',
      request: { url: 'https://site.sn/boutique/x?suivi=771234567', method: 'GET', headers: { cookie: 'secret' }, data: { phone: '771234567' } },
      exception: { values: [{ value: 'Erreur pour awa@exemple.sn' }] },
      user: { id: 'm1', email: 'awa@exemple.sn', ip_address: '1.2.3.4' },
      breadcrumbs: [{ category: 'console', message: 'PIN 4827' }, { category: 'fetch', data: { url: 'https://x.supabase.co/rest/v1/orders?customer_phone=eq.771234567', body: '{}' } }],
    });
    expect(event.message).toBe('Commande de [numéro]');
    expect(event.request).toEqual({ url: 'https://site.sn/boutique/x', method: 'GET' });
    expect(event.exception.values[0].value).toBe('Erreur pour [email]');
    expect(event.user).toEqual({ id: 'm1' });
    expect(event.breadcrumbs).toHaveLength(1); // la ligne de console est supprimée
    expect(event.breadcrumbs[0].data).toEqual({ url: 'https://x.supabase.co/rest/v1/orders' });
  });

  it('ne garde pas les messages de la console', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'x' })).toBeNull();
  });

  it('donne une référence courte même quand Sentry est inactif', () => {
    expect(captureError(new Error('test'))).toMatch(/^[A-Z0-9]{8}$/);
  });
});
