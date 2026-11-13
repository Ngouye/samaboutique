// Parcours « paiement en ligne » (Wave / Orange Money via PayDunya) côté serveur.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { startFakeSupabase, startFakePaydunya } from '../helpers/fakeServices.js';

const MERCHANT = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const BOUBOU = 'aaaaaaaa-0000-0000-0000-000000000001';
const MONTRE = 'aaaaaaaa-0000-0000-0000-000000000002';
const MASTER_KEY = 'cle-principale-de-test';
const GOOD_HASH = crypto.createHash('sha512').update(MASTER_KEY).digest('hex');

let supabase, paydunya, server, api;

const post = (path, body, headers = {}) => fetch(api + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const order = (overrides = {}) => ({
  orderDetails: {
    merchant_id: MERCHANT, name: 'Fatou Diop', phone: '781112233', address: 'Médina, rue 11', zone: 'Dakar Plateau / Médina',
    cartItems: [{ product_id: BOUBOU, name: 'Boubou (M)', price: 1, quantity: 2 }],
    ...overrides,
  },
});

beforeAll(async () => {
  supabase = await startFakeSupabase({
    merchants: [
      { id: MERCHANT, shop_name: 'Chez Awa', delivery_zones: null, payout_phone_number: '771234567', payout_provider: 'WAVE' },
      { id: OTHER, shop_name: 'Chez Ali', delivery_zones: null, payout_phone_number: null },
    ],
    products: [
      { id: BOUBOU, merchant_id: MERCHANT, name: 'Boubou', price_fcfa: 25000 },
      { id: MONTRE, merchant_id: OTHER, name: 'Montre', price_fcfa: 18000 },
    ],
    orders: [],
  });
  paydunya = await startFakePaydunya();
  Object.assign(process.env, {
    SUPABASE_URL: supabase.url, SUPABASE_SERVICE_ROLE_KEY: 'service-test',
    PAYDUNYA_MASTER_KEY: MASTER_KEY, PAYDUNYA_PRIVATE_KEY: 'prive', PAYDUNYA_TOKEN: 'jeton', PAYDUNYA_API_URL: paydunya.url,
    FRONTEND_URL: 'https://samaboutik.test', BACKEND_URL: 'https://api.samaboutik.test',
  });
  delete process.env.SENTRY_DSN;
  const { default: app } = await import('../../server/app.js');
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  api = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => { server?.close(); supabase?.close(); paydunya?.close(); });

describe('Création du paiement', () => {
  it('recalcule le montant à partir des prix en base (un prix modifié dans le navigateur est ignoré)', async () => {
    const res = await post('/api/payments/create', order());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.paymentUrl).toBe('https://paydunya.test/checkout/tok_1');

    const saved = supabase.db.orders.at(-1);
    expect(saved.total_amount_fcfa).toBe(25000 * 2 + 1000); // 2 boubous + zone Plateau
    expect(saved.payment_method).toBe('MOBILE_MONEY');
    expect(saved.status).toBe('PENDING');
    expect(saved.delivery_pin).toMatch(/^\d{4}$/);

    const invoice = paydunya.state.invoices.at(-1).body;
    expect(invoice.invoice.total_amount).toBe(51000);
    expect(invoice.actions.return_url).toBe(`https://samaboutik.test/boutique/Chez%20Awa?payment=success&orderId=${saved.id}`);
    expect(invoice.actions.callback_url).toBe('https://api.samaboutik.test/api/payments/webhook');
  });

  it('refuse les paniers et coordonnées invalides', async () => {
    const cases = [
      order({ cartItems: [] }),
      order({ address: '' }),
      order({ cartItems: [{ product_id: BOUBOU, quantity: 0 }] }),
      order({ cartItems: [{ product_id: BOUBOU, quantity: 1000 }] }),
      order({ cartItems: [{ product_id: BOUBOU, quantity: 1.5 }] }),
    ];
    for (const c of cases) expect((await post('/api/payments/create', c)).status).toBe(400);
  });

  it('refuse un produit d’une autre boutique et une zone inconnue', async () => {
    expect((await post('/api/payments/create', order({ cartItems: [{ product_id: MONTRE, quantity: 1 }] }))).status).toBe(400);
    expect((await post('/api/payments/create', order({ zone: 'Zone inventée' }))).status).toBe(400);
  });

  it('produit épuisé : transmet le message de la base au client, sans créer de facture', async () => {
    const message = 'Désolé, « Boubou » est épuisé. Retirez-le du panier pour continuer.';
    const invoices = paydunya.state.invoices.length;
    supabase.state.failNextInsert = { code: 'P0001', message };
    // Autre client (autre adresse IP) : n'entame pas la limite de 10 demandes testée plus bas.
    const res = await post('/api/payments/create', order(), { 'x-forwarded-for': '10.9.9.9' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ success: false, error: message });
    expect(paydunya.state.invoices).toHaveLength(invoices);
  });

  it('ouvre la page PayDunya directement sur l’opérateur choisi (Wave, Orange Money, Free Money, Wizall)', async () => {
    const expected = { wave: 'wave-senegal', orange_money: 'orange-money-senegal', free_money: 'free-money-senegal', wizall: 'wizall-senegal' };
    for (const [channel, paydunyaChannel] of Object.entries(expected)) {
      const res = await post('/api/payments/create', order({ channel }), { 'x-forwarded-for': '10.9.9.10' });
      expect(res.status).toBe(200);
      expect(paydunya.state.invoices.at(-1).body.invoice.channels).toEqual([paydunyaChannel]);
      expect(supabase.db.orders.at(-1).payment_channel).toBe(channel);
    }
    const bad = await post('/api/payments/create', order({ channel: 'bitcoin' }), { 'x-forwarded-for': '10.9.9.11' });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe('Moyen de paiement invalide');
  });

  it('refuse une boutique inexistante', async () => {
    expect((await post('/api/payments/create', order({ merchant_id: '99999999-9999-9999-9999-999999999999' }))).status).toBe(404);
  });

  it('n’autorise que le site SamaBoutik à appeler l’API depuis un navigateur', async () => {
    const ok = await fetch(`${api}/health`, { headers: { origin: 'https://samaboutik.test' } });
    const pirate = await fetch(`${api}/health`, { headers: { origin: 'https://site-pirate.test' } });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://samaboutik.test');
    expect(pirate.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('Notification de paiement PayDunya (webhook)', () => {
  const lastOrder = () => supabase.db.orders.find((o) => o.payment_method === 'MOBILE_MONEY');

  it('rejette une notification sans signature valide', async () => {
    const res = await post('/api/payments/webhook', { data: { hash: 'faux', invoice: { token: 'tok_1' } } });
    expect(res.status).toBe(401);
    expect(lastOrder().status).toBe('PENDING');
  });

  it('ne valide rien tant que PayDunya ne confirme pas le paiement', async () => {
    paydunya.state.confirm.tok_1 = { response_code: '00', status: 'pending' };
    const res = await post('/api/payments/webhook', { data: { hash: GOOD_HASH, invoice: { token: 'tok_1' } } });
    expect(res.status).toBe(200);
    expect(lastOrder().status).toBe('PENDING');
  });

  it('signale un montant payé différent du montant de la commande', async () => {
    paydunya.state.confirm.tok_1 = { response_code: '00', status: 'completed', invoice: { total_amount: 100 }, custom_data: { order_id: lastOrder().id } };
    await post('/api/payments/webhook', { data: { hash: GOOD_HASH, invoice: { token: 'tok_1' } } });
    expect(lastOrder().status).toBe('PENDING');
    expect(lastOrder().payment_status).toBe('AMOUNT_MISMATCH');
    expect(paydunya.state.payouts).toHaveLength(0);
  });

  it('valide la commande payée et reverse 95 % au marchand, une seule fois', async () => {
    paydunya.state.confirm.tok_1 = { response_code: '00', status: 'completed', invoice: { total_amount: 51000 }, custom_data: { order_id: lastOrder().id } };
    const first = await post('/api/payments/webhook', { data: { hash: GOOD_HASH, invoice: { token: 'tok_1' } } });
    expect(first.status).toBe(200);
    expect(lastOrder().status).toBe('PREPARING');
    expect(lastOrder().payment_status).toBe('PAID');
    expect(paydunya.state.payouts).toEqual([{ account_alias: '771234567', amount: 51000 - Math.floor(51000 * 0.05) }]);

    // Notification rejouée (PayDunya renvoie parfois) : aucun second reversement.
    const replay = await post('/api/payments/webhook', { data: { hash: GOOD_HASH, invoice: { token: 'tok_1' } } });
    expect(await replay.text()).toBe('Déjà traité');
    expect(paydunya.state.payouts).toHaveLength(1);
  });
});

describe('Robustesse du serveur', () => {
  it('répond sur /health avec les en-têtes de sécurité', async () => {
    const res = await fetch(`${api}/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('répond proprement à une requête mal formée ou une adresse inconnue', async () => {
    const bad = await fetch(`${api}/api/payments/create`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{pas du json' });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ success: false, error: 'Requête invalide' });
    expect((await fetch(`${api}/nimporte-quoi`)).status).toBe(404);
  });

  it('bloque les robots : 10 créations de paiement maximum par 10 minutes', async () => {
    // 8 demandes déjà faites plus haut ; on dépasse la limite.
    let status = 0;
    for (let i = 0; i < 5 && status !== 429; i++) status = (await post('/api/payments/create', order({ cartItems: [] }))).status;
    expect(status).toBe(429);
  });
});
