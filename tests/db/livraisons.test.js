// Communication boutique / livreurs / client (livraisons_suivi.sql), sur une vraie base PostgreSQL :
// journal de chaque commande, problème signalé par le livreur, course rendue, livreur effacé quand
// une course revient en préparation, droits d'accès au journal.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { createDatabase, IDS, cart } from '../helpers/supabaseDb.js';

let t;
beforeAll(async () => {
  t = await createDatabase({ extra: ['suivi_commande.sql', 'acompte_livraison.sql', 'livraisons_suivi.sql'] });
  await t.asAuthService();
  await t.db.exec(fs.readFileSync(new URL('../../livraisons_suivi.sql', import.meta.url), 'utf8')); // relancé sans risque
});
afterAll(async () => { await t?.close(); });

const ZONE = 'Dakar Plateau / Médina';
const events = async (orderId) => {
  await t.as('service_role');
  return t.query(`SELECT kind, status, actor, actor_name, message FROM public.order_events WHERE order_id = $1 ORDER BY id`, [orderId]);
};
const login = async (phone, cni, ip) => {
  await t.as('anon', null, { ip });
  return (await t.value(`SELECT public.authenticate_driver('Chez Awa', $1, $2) AS v`, [phone, cni])).token;
};
const setStatus = async (orderId, status) => {
  await t.as('authenticated', IDS.MERCHANT);
  await t.query(`UPDATE public.orders SET status = $2 WHERE id = $1`, [orderId, status]);
};

let orderId;
let mamadou;
let lamine;

describe('Installation', () => {
  it('le script s’installe après les autres, sans erreur, et peut être relancé', () => {
    expect(t.installErrors).toEqual([]);
  });
});

describe('Journal d’une commande, de la commande à la livraison', () => {
  it('la commande passée est journalisée', async () => {
    await t.as('service_role');
    const [row] = await t.query(
      `INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items, payment_method)
       VALUES ($1, 'Fatou Diop', '781112233', 'Médina, rue 11', $2, 5, $3::jsonb, 'DEPOSIT') RETURNING id`,
      [IDS.MERCHANT, ZONE, cart()],
    );
    orderId = row.id;
    expect(await events(orderId)).toEqual([
      { kind: 'created', status: 'PENDING', actor: 'client', actor_name: null, message: 'Commande passée · acompte de 10 % en attente de paiement' },
    ]);
  });

  it('acompte payé puis commande acceptée par la boutique', async () => {
    await t.as('service_role');
    await t.query(`UPDATE public.orders SET payment_status = 'DEPOSIT_PAID' WHERE id = $1`, [orderId]);
    await setStatus(orderId, 'PREPARING');
    const log = await events(orderId);
    expect(log[1]).toMatchObject({ kind: 'payment', actor: 'paiement', message: 'Acompte de 5100 F payé en ligne' });
    expect(log[2]).toMatchObject({ kind: 'status', status: 'PREPARING', actor: 'boutique', message: 'Passée à « En préparation » par la boutique' });
  });

  it('le livreur prend la course, signale un problème, puis la rend', async () => {
    mamadou = await login('770000001', 'CNI-1', '10.2.0.1');
    await t.as('anon');
    expect(await t.value(`SELECT public.assign_order_to_driver($1, $2) AS v`, [mamadou, orderId])).toBe(true);
    await t.as('anon');
    expect(await t.value(`SELECT public.report_delivery_issue($1, $2, 'Client injoignable') AS v`, [mamadou, orderId])).toBe(true);
    await t.as('anon');
    expect(await t.value(`SELECT public.release_order($1, $2, 'Panne de moto') AS v`, [mamadou, orderId])).toBe(true);

    await t.as('service_role');
    const [order] = await t.query(`SELECT status, driver_name FROM public.orders WHERE id = $1`, [orderId]);
    expect(order).toEqual({ status: 'PREPARING', driver_name: null });
    const log = (await events(orderId)).slice(3);
    expect(log).toEqual([
      { kind: 'driver_taken', status: 'IN_TRANSIT', actor: 'livreur', actor_name: 'Mamadou', message: 'Mamadou a pris la course' },
      { kind: 'driver_issue', status: 'IN_TRANSIT', actor: 'livreur', actor_name: 'Mamadou', message: 'Client injoignable' },
      { kind: 'driver_released', status: 'PREPARING', actor: 'livreur', actor_name: 'Mamadou', message: 'Course rendue par Mamadou : Panne de moto' },
    ]);
  });

  it('un autre livreur la reprend et la livre avec le code du client', async () => {
    lamine = await login('770000002', 'CNI-2', '10.2.0.2');
    await t.as('anon');
    expect(await t.value(`SELECT public.assign_order_to_driver($1, $2) AS v`, [lamine, orderId])).toBe(true);
    await t.as('service_role');
    const [{ delivery_pin: pin }] = await t.query(`SELECT delivery_pin FROM public.orders WHERE id = $1`, [orderId]);
    await t.as('anon');
    expect((await t.value(`SELECT public.mark_order_delivered($1, $2, $3) AS v`, [lamine, orderId, pin])).ok).toBe(true);
    const log = (await events(orderId)).slice(-2);
    expect(log.map((e) => e.message)).toEqual(['Lamine a pris la course', 'Livrée par Lamine (code du client validé)']);
  });
});

describe('Règles et droits', () => {
  it('un livreur ne peut ni rendre ni signaler la course d’un autre', async () => {
    await t.as('service_role');
    const [row] = await t.query(
      `INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items, payment_method, status)
       VALUES ($1, 'Awa', '760000001', 'Ouakam', $2, 5, $3::jsonb, 'MOBILE_MONEY', 'PENDING') RETURNING id`,
      [IDS.MERCHANT, ZONE, cart()],
    );
    await t.as('service_role');
    await t.query(`UPDATE public.orders SET status = 'PREPARING', payment_status = 'PAID' WHERE id = $1`, [row.id]);
    await t.as('anon');
    await t.value(`SELECT public.assign_order_to_driver($1, $2) AS v`, [lamine, row.id]);
    await t.as('anon');
    expect((await t.attempt(`SELECT public.release_order($1, $2) AS v`, [mamadou, row.id])).error).toBe('Cette course ne vous est pas assignée.');
    await t.as('anon');
    expect((await t.attempt(`SELECT public.report_delivery_issue($1, $2, 'Test') AS v`, [mamadou, row.id])).error).toBe('Cette course ne vous est pas assignée.');
    await t.as('anon');
    expect((await t.attempt(`SELECT public.report_delivery_issue($1, $2, 'a') AS v`, [lamine, row.id])).error).toBe('Décrivez le problème en quelques mots.');

    // La boutique remet la course en préparation : le livreur est effacé.
    await setStatus(row.id, 'PREPARING');
    await t.as('service_role');
    expect((await t.query(`SELECT driver_name FROM public.orders WHERE id = $1`, [row.id]))[0].driver_name).toBeNull();
  });

  it('une commande marquée « Livrée » par la boutique reçoit son heure de livraison (bilan du jour)', async () => {
    await t.as('service_role');
    const [row] = await t.query(
      `INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items, payment_method, status)
       VALUES ($1, 'Moussa', '760000002', 'Fann', $2, 5, $3::jsonb, 'MOBILE_MONEY', 'PENDING') RETURNING id`,
      [IDS.MERCHANT, ZONE, cart()],
    );
    await t.as('service_role');
    await t.query(`UPDATE public.orders SET payment_status = 'PAID', status = 'PREPARING' WHERE id = $1`, [row.id]);
    await t.as('anon');
    await t.value(`SELECT public.assign_order_to_driver($1, $2) AS v`, [lamine, row.id]);
    await setStatus(row.id, 'DELIVERED');
    await t.as('service_role');
    const [order] = await t.query(`SELECT driver_name, delivered_at FROM public.orders WHERE id = $1`, [row.id]);
    expect(order.driver_name).toBe('Lamine');
    expect(order.delivered_at).not.toBeNull();
  });

  it('seule la boutique lit son journal ; personne ne l’écrit directement', async () => {
    await t.as('authenticated', IDS.MERCHANT);
    expect((await t.query(`SELECT count(*)::INT AS n FROM public.order_events WHERE order_id = $1`, [orderId]))[0].n).toBeGreaterThan(5);
    await t.as('authenticated', IDS.OTHER);
    expect((await t.query(`SELECT count(*)::INT AS n FROM public.order_events WHERE order_id = $1`, [orderId]))[0].n).toBe(0);
    await t.as('anon');
    expect((await t.query(`SELECT count(*)::INT AS n FROM public.order_events`))[0].n).toBe(0);
    await t.as('authenticated', IDS.MERCHANT);
    const forged = await t.attempt(`INSERT INTO public.order_events (order_id, merchant_id, kind, actor, message) VALUES ($1, $2, 'status', 'boutique', 'faux')`, [orderId, IDS.MERCHANT]);
    expect(forged.error).toMatch(/permission denied|row-level security/);
  });
});

describe('Côté client : historique simplifié (track_order_history)', () => {
  it('le client voit les étapes de sa commande, sans les messages des livreurs ni les raisons', async () => {
    await t.as('service_role');
    const [{ delivery_pin: pin }] = await t.query(`SELECT delivery_pin FROM public.orders WHERE id = $1`, [orderId]);
    await t.as('anon', null, { ip: '10.3.0.1' });
    const res = await t.value(`SELECT public.track_order_history('+221 78 111 22 33', $1) AS v`, [pin]);
    expect(res.ok).toBe(true);
    expect(res.order_id).toBe(orderId);
    expect(res.events.map((e) => e.kind)).toEqual([
      'created', 'deposit_paid', 'accepted', 'driver_taken', 'driver_calling', 'driver_changed', 'driver_taken', 'delivered',
    ]);
    expect(res.events.filter((e) => e.name).map((e) => e.name)).toEqual(['Mamadou', 'Lamine']);
    expect(JSON.stringify(res)).not.toMatch(/Panne|injoignable|message/i);
  });

  it('un mauvais code est refusé et compte comme un essai (mêmes limites que le suivi)', async () => {
    await t.as('anon', null, { ip: '10.3.0.2' });
    expect(await t.value(`SELECT public.track_order_history('781112233', 'XXXX') AS v`))
      .toEqual({ ok: false, error: 'Commande introuvable ou code PIN incorrect' });
    await t.as('service_role');
    expect(await t.value(`SELECT public.attempts_count('track', '781112233', interval '15 minutes') AS v`)).toBe(1);
  });
});
