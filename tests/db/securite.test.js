// Non-régression du chantier sécurité : chaque faille corrigée reste fermée.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, IDS, isDenied } from '../helpers/supabaseDb.js';

let t;
beforeAll(async () => {
  t = await createDatabase();
  await t.as('service_role');
  await t.query(`UPDATE public.merchants SET payout_phone_number = '770000099', payout_provider = 'WAVE' WHERE id = $1`, [IDS.MERCHANT]);
});
afterAll(async () => { await t?.close(); });

describe('Fiches des marchands', () => {
  it('un visiteur lit la vitrine mais pas les données privées', async () => {
    await t.as('anon');
    const [shop] = await t.query(`SELECT shop_name, phone_number, delivery_zones, theme_color, layout_style FROM public.merchants WHERE id = $1`, [IDS.MERCHANT]);
    expect(shop.shop_name).toBe('Chez Awa');
    for (const sql of [`SELECT payout_phone_number FROM public.merchants`, `SELECT * FROM public.merchants`, `SELECT subscription_end_date FROM public.merchants`]) {
      await t.as('anon');
      expect(isDenied(await t.attempt(sql)), sql).toBe(true);
    }
  });

  it('un marchand ne lit ni ne modifie la boutique d’un autre', async () => {
    await t.as('authenticated', IDS.OTHER);
    expect(isDenied(await t.attempt(`SELECT payout_provider FROM public.merchants WHERE id = $1`, [IDS.MERCHANT]))).toBe(true);
    await t.as('authenticated', IDS.OTHER);
    expect((await t.attempt(`UPDATE public.merchants SET description = 'pirate' WHERE id = $1 RETURNING 1`, [IDS.MERCHANT])).rows).toEqual([]);
  });

  it('un marchand ne peut pas s’offrir un forfait ni supprimer sa fiche', async () => {
    await t.as('authenticated', IDS.MERCHANT);
    expect((await t.attempt(`UPDATE public.merchants SET subscription_plan = 'premium' WHERE id = $1`, [IDS.MERCHANT])).error).toMatch(/non autorisée/);
    await t.as('authenticated', IDS.MERCHANT);
    expect(isDenied(await t.attempt(`DELETE FROM public.merchants WHERE id = $1`, [IDS.MERCHANT]))).toBe(true);
  });

  it('le marchand modifie toujours ses propres paramètres, thème compris', async () => {
    await t.as('authenticated', IDS.MERCHANT);
    expect((await t.attempt(`UPDATE public.merchants SET layout_style = 'minuit', theme_color = '#c9a24a' WHERE id = $1`, [IDS.MERCHANT])).error).toBeUndefined();
  });
});

describe('Tables sensibles fermées aux visiteurs', () => {
  for (const table of ['orders', 'drivers', 'driver_sessions', 'security_attempts', 'platform_admins', 'merchant_locations', 'notification_outbox', 'delivery_positions']) {
    it(`« ${table} »`, async () => {
      await t.as('anon');
      expect(isDenied(await t.attempt(`SELECT count(*) FROM public.${table}`))).toBe(true);
    });
  }

  it('les avis ne révèlent pas l’identifiant de commande et ne s’écrivent qu’avec les contrôles', async () => {
    await t.as('anon');
    expect(isDenied(await t.attempt(`SELECT order_id FROM public.reviews`))).toBe(true);
    await t.as('anon');
    expect(isDenied(await t.attempt(`INSERT INTO public.reviews (product_id, rating, comment) VALUES ($1, 1, 'spam')`, [IDS.BOUBOU]))).toBe(true);
  });

  it('les livreurs d’une boutique restent invisibles pour les autres marchands', async () => {
    await t.as('authenticated', IDS.MERCHANT);
    expect((await t.query(`SELECT full_name FROM public.drivers`)).length).toBe(2);
    await t.as('authenticated', IDS.OTHER);
    expect((await t.query(`SELECT count(*)::int AS n FROM public.drivers`))[0].n).toBe(0);
  });
});

describe('Administration : double authentification obligatoire', () => {
  it('sans code, le compte admin est reconnu mais les données restent verrouillées', async () => {
    await t.as('authenticated', IDS.ADMIN, { aal: 'aal1' });
    expect((await t.query(`SELECT public.is_platform_admin_account() AS a, public.is_platform_admin() AS b`))[0]).toEqual({ a: true, b: false });
    await t.as('authenticated', IDS.ADMIN, { aal: 'aal1' });
    expect((await t.attempt(`SELECT count(*) FROM public.admin_merchants_overview()`)).error).toMatch(/réservé/);
  });

  it('avec le code, l’administrateur accède à la vue d’ensemble', async () => {
    await t.as('authenticated', IDS.ADMIN, { aal: 'aal2' });
    expect((await t.query(`SELECT count(*)::int AS n FROM public.admin_merchants_overview()`))[0].n).toBeGreaterThanOrEqual(3);
  });

  it('un marchand, même avec un code, n’est pas administrateur', async () => {
    await t.as('authenticated', IDS.MERCHANT, { aal: 'aal2' });
    expect((await t.query(`SELECT public.is_platform_admin() AS b`))[0].b).toBe(false);
    await t.as('anon');
    expect((await t.attempt(`SELECT public.is_platform_admin_account()`)).error).toBeTruthy();
  });
});
