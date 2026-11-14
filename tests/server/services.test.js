// Microservices : chaque déploiement (SERVICE=commandes ou SERVICE=ia) n'expose que ses propres routes.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startFakeSupabase } from '../helpers/fakeServices.js';

let supabase;
const servers = {};
const urls = {};

beforeAll(async () => {
  supabase = await startFakeSupabase({ users: {}, merchants: [], ai_usage: [] });
  Object.assign(process.env, {
    SUPABASE_URL: supabase.url, SUPABASE_SERVICE_ROLE_KEY: 'service-test', FRONTEND_URL: 'https://samaboutik.test',
  });
  delete process.env.SENTRY_DSN;
  const { createApp } = await import('../../server/app.js');
  for (const [name, services] of Object.entries({ commandes: ['commandes'], ia: ['ia'], tout: ['commandes', 'ia'] })) {
    servers[name] = createApp({ services }).listen(0, '127.0.0.1');
    await new Promise((resolve) => servers[name].once('listening', resolve));
    urls[name] = `http://127.0.0.1:${servers[name].address().port}`;
  }
});

afterAll(() => { Object.values(servers).forEach((s) => s.close()); supabase?.close(); });

const createPayment = (url) => fetch(`${url}/api/payments/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
const aiQuota = (url) => fetch(`${url}/api/ai/quota`);

describe('microservices', () => {
  it('« commandes » : paiements et avis, pas d’assistant IA', async () => {
    expect((await createPayment(urls.commandes)).status).not.toBe(404);
    expect((await aiQuota(urls.commandes)).status).toBe(404);
    expect(await (await fetch(`${urls.commandes}/health`)).json()).toMatchObject({ status: 'OK', services: ['commandes'] });
  });

  it('« ia » : assistant IA seulement, aucune route de paiement', async () => {
    expect((await aiQuota(urls.ia)).status).toBe(401); // existe, demande une connexion
    expect((await createPayment(urls.ia)).status).toBe(404);
    expect((await fetch(`${urls.ia}/api/payments/webhook`, { method: 'POST' })).status).toBe(404);
    expect(await (await fetch(`${urls.ia}/health`)).json()).toMatchObject({ services: ['ia'] });
  });

  it('sans SERVICE : tout ensemble (développement local)', async () => {
    expect((await aiQuota(urls.tout)).status).toBe(401);
    expect((await createPayment(urls.tout)).status).not.toBe(404);
  });

  it('valeur de SERVICE vérifiée au démarrage', async () => {
    const { parseServices } = await import('../../server/app.js');
    expect(parseServices('')).toEqual(['commandes', 'ia']);
    expect(parseServices('tout')).toEqual(['commandes', 'ia']);
    expect(parseServices(' IA ')).toEqual(['ia']);
    expect(parseServices('commandes,ia')).toEqual(['commandes', 'ia']);
    expect(() => parseServices('paiement')).toThrow(/SERVICE inconnu/);
  });
});
