// Assistant IA des commerçants : fiche produit rédigée par Claude, photo studio Photoroom, plafonds.
// Claude et Photoroom sont remplacés par de faux services locaux : aucun appel réel, aucun coût.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startFakeSupabase, startFakeAnthropic, startFakePhotoroom, claudeJson } from '../helpers/fakeServices.js';

const MERCHANT = '11111111-1111-1111-1111-111111111111';
const PHOTO = `data:image/jpeg;base64,${Buffer.from('fausse-photo-jpeg').toString('base64')}`;
let supabase, claude, photoroom, server, api;

const call = (path, body, token = 'jeton-awa') => fetch(api + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});

const goodSheet = {
  is_product: true,
  issue: '',
  name: 'Robe wax évasée à manches bouffantes',
  description: 'Une robe en tissu wax aux couleurs vives, coupe évasée et manches bouffantes. Idéale pour la Korité ou un mariage.',
  category: 'Vêtements',
  tags: ['Wax', 'robe', 'korité', 'wax', ' mariage '],
  features: [
    { name: 'Couleur', value: 'Orange et bleu' },
    { name: 'Matière', value: 'Wax' },
    { name: 'Taille', value: '' },
    { name: 'Pointure', value: '42' }, // pas une caractéristique des vêtements : ignorée
  ],
};

beforeAll(async () => {
  supabase = await startFakeSupabase({
    users: { 'jeton-awa': { id: MERCHANT, email: 'awa@test.sn' } },
    merchants: [{ id: MERCHANT, shop_name: 'Chez Awa', subscription_plan: 'debutant', subscription_status: null, subscription_end_date: null }],
    ai_usage: [],
  });
  claude = await startFakeAnthropic();
  photoroom = await startFakePhotoroom();
  Object.assign(process.env, {
    SUPABASE_URL: supabase.url, SUPABASE_SERVICE_ROLE_KEY: 'service-test',
    ANTHROPIC_API_KEY: 'cle-claude-test', ANTHROPIC_BASE_URL: claude.url,
    PHOTOROOM_API_KEY: 'cle-photoroom-test', PHOTOROOM_API_URL: photoroom.url,
    FRONTEND_URL: 'https://samaboutik.test',
  });
  delete process.env.SENTRY_DSN;
  const { default: app } = await import('../../server/app.js');
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  api = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => { server?.close(); supabase?.close(); claude?.close(); photoroom?.close(); });

beforeEach(() => {
  supabase.db.ai_usage.length = 0;
  claude.state.requests.length = 0;
  photoroom.state.requests.length = 0;
  photoroom.state.status = 200;
  claude.state.reply = () => claudeJson(goodSheet);
});

describe('Accès', () => {
  it('réservé aux commerçants connectés', async () => {
    expect((await call('/api/ai/product-sheet', { image: PHOTO }, null)).status).toBe(401);
    expect((await call('/api/ai/product-sheet', { image: PHOTO }, 'jeton-invente')).status).toBe(401);
    expect((await call('/api/ai/studio-photo', { image: PHOTO }, null)).status).toBe(401);
    expect(claude.state.requests).toHaveLength(0);
  });

  it('refuse une photo manquante ou qui n’est pas une image', async () => {
    expect((await call('/api/ai/product-sheet', {})).status).toBe(400);
    expect((await call('/api/ai/product-sheet', { image: 'data:text/html;base64,PHNjcmlwdD4=' })).status).toBe(400);
  });
});

describe('Fiche produit rédigée par Claude', () => {
  it('envoie la photo à Claude et renvoie une fiche propre', async () => {
    const res = await call('/api/ai/product-sheet', { image: PHOTO, hint: 'robe pour la Korité' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sheet).toEqual({
      name: 'Robe wax évasée à manches bouffantes',
      description: goodSheet.description,
      category: 'Vêtements',
      tags: ['wax', 'robe', 'korité', 'mariage'],
      features: { Couleur: 'Orange et bleu', 'Matière': 'Wax' },
    });
    expect(body.quota).toMatchObject({ plan: 'debutant', limit: 30, used: 1, remaining: 29 });

    const sent = claude.state.requests[0];
    expect(sent.body.model).toBe('claude-opus-5-5');
    expect(sent.body.fallbacks).toBe('default');
    expect(sent.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
    expect(sent.body.output_config.format.type).toBe('json_schema');
    expect(sent.body.output_config.format.schema.properties.category.enum).toContain('Beauté & Santé');
    const [imageBlock, textBlock] = sent.body.messages[0].content;
    expect(imageBlock).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: PHOTO.split(',')[1] } });
    expect(textBlock.text).toContain('<indication>robe pour la Korité</indication>');
    expect(supabase.db.ai_usage).toHaveLength(1);
    expect(supabase.db.ai_usage[0]).toMatchObject({ merchant_id: MERCHANT, kind: 'product_sheet' });
  });

  it('explique quoi refaire quand la photo ne montre pas un produit, sans décompter', async () => {
    claude.state.reply = () => claudeJson({ ...goodSheet, is_product: false, issue: 'La photo est trop sombre : reprenez-la près d’une fenêtre.' });
    const res = await call('/api/ai/product-sheet', { image: PHOTO });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('La photo est trop sombre : reprenez-la près d’une fenêtre.');
    expect(supabase.db.ai_usage).toHaveLength(0);
  });

  it('gère un refus des filtres de sécurité', async () => {
    claude.state.reply = () => claudeJson(null, 'refusal');
    const res = await call('/api/ai/product-sheet', { image: PHOTO });
    expect(res.status).toBe(422);
    expect(supabase.db.ai_usage).toHaveLength(0);
  });

  it('applique le plafond mensuel du forfait (30 fiches en Débutant)', async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 30; i++) supabase.db.ai_usage.push({ id: i, merchant_id: MERCHANT, kind: 'product_sheet', created_at: now });
    const res = await call('/api/ai/product-sheet', { image: PHOTO });
    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/30 fiches/);
    expect(claude.state.requests).toHaveLength(0);
  });

  it('message clair quand l’assistant n’est pas activé (pas de clé)', async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const res = await call('/api/ai/product-sheet', { image: PHOTO });
    process.env.ANTHROPIC_API_KEY = key;
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/pas encore activé/);
  });
});

describe('Photo studio (Photoroom)', () => {
  it('fond blanc studio avec ombre douce', async () => {
    const res = await call('/api/ai/studio-photo', { image: PHOTO, style: 'studio' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.image).toBe(`data:image/webp;base64,${Buffer.from('RIFF0000WEBPimage-retravaillee').toString('base64')}`);
    const sent = photoroom.state.requests[0];
    expect(sent.url).toBe('/v2/edit');
    expect(sent.headers['x-api-key']).toBe('cle-photoroom-test');
    for (const field of ['imageFile', 'removeBackground', 'background.color', 'shadow.mode', 'outputSize', 'export.format']) {
      expect(sent.text).toContain(`name="${field}"`);
    }
    expect(sent.text).toContain('ai.soft');
    expect(sent.text).not.toContain('name="background.prompt"');
    expect(supabase.db.ai_usage[0]).toMatchObject({ kind: 'studio_photo' });
  });

  it('décor wax généré autour du vrai produit', async () => {
    await call('/api/ai/studio-photo', { image: PHOTO, style: 'wax' });
    const sent = photoroom.state.requests[0];
    expect(sent.text).toContain('name="background.prompt"');
    expect(sent.text).toContain('wax print fabric');
    expect(sent.text).not.toContain('name="shadow.mode"');
  });

  it('crédit Photoroom épuisé : message clair, rien de décompté', async () => {
    photoroom.state.status = 402;
    const res = await call('/api/ai/studio-photo', { image: PHOTO });
    expect(res.status).toBe(503);
    expect(supabase.db.ai_usage).toHaveLength(0);
  });

  it('plafond mensuel : 10 photos studio en Débutant', async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 10; i++) supabase.db.ai_usage.push({ id: i, merchant_id: MERCHANT, kind: 'studio_photo', created_at: now });
    const res = await call('/api/ai/studio-photo', { image: PHOTO });
    expect(res.status).toBe(402);
    expect(photoroom.state.requests).toHaveLength(0);
  });
});

describe('Utilisations restantes', () => {
  it('indique ce qui est activé et ce qui reste ce mois-ci', async () => {
    supabase.db.ai_usage.push({ id: 1, merchant_id: MERCHANT, kind: 'studio_photo', created_at: new Date().toISOString() });
    const res = await fetch(`${api}/api/ai/quota`, { headers: { authorization: 'Bearer jeton-awa' } });
    const body = await res.json();
    expect(body.enabled).toEqual({ product_sheet: true, studio_photo: true });
    expect(body.quota.studio_photo).toMatchObject({ limit: 10, used: 1, remaining: 9 });
    expect(body.quota.product_sheet).toMatchObject({ limit: 30, used: 0 });
  });
});
