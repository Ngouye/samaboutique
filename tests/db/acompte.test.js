// Paiement à la livraison avec acompte de 10 % (acompte_livraison.sql), joué sur une vraie base PostgreSQL :
// la vitrine ne peut plus commander sans acompte, le serveur enregistre la commande, l'acompte payé
// l'annonce à la boutique et réserve le stock, le livreur encaisse le reste.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { createDatabase, IDS, cart } from '../helpers/supabaseDb.js';

let t;
beforeAll(async () => {
  t = await createDatabase({ extra: ['acompte_livraison.sql'] });
  await t.asAuthService();
  await t.db.exec(fs.readFileSync(new URL('../../acompte_livraison.sql', import.meta.url), 'utf8')); // relancé sans risque
});
afterAll(async () => { await t?.close(); });

const ZONE = 'Dakar Plateau / Médina'; // 1 000 F par défaut
const insertAsServer = async (method, items = cart(), channel = 'wave') => {
  await t.as('service_role');
  const [row] = await t.query(
    `INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items, payment_method, payment_channel)
     VALUES ($1, 'Fatou Diop', '781112233', 'Médina, rue 11', $2, 5, $3::jsonb, $4, $5) RETURNING *`,
    [IDS.MERCHANT, ZONE, items, method, channel],
  );
  return row;
};
const stock = async () => { await t.as('service_role'); return (await t.query(`SELECT stock FROM public.products WHERE id = $1`, [IDS.BOUBOU]))[0].stock; };
const events = async (id) => { await t.as('service_role'); return (await t.query(`SELECT event, payload FROM public.notification_outbox WHERE order_id = $1 ORDER BY event`, [id])); };

describe('Installation', () => {
  it('le script s’installe après les autres, sans erreur, et peut être relancé', () => {
    expect(t.installErrors).toEqual([]);
  });

  it('acompte = 10 % du total, arrondi aux 5 F supérieurs', async () => {
    await t.as('anon');
    expect(await t.value(`SELECT public.order_deposit(51000) AS v`)).toBe(5100);
    await t.as('anon');
    expect(await t.value(`SELECT public.order_deposit(12730) AS v`)).toBe(1275);
    await t.as('anon');
    expect(await t.value(`SELECT public.order_deposit(3) AS v`)).toBe(3);
  });
});

describe('Commande à la livraison avec acompte', () => {
  let order;

  it('la vitrine ne peut plus commander à la livraison sans acompte', async () => {
    const before = await stock();
    await t.as('anon', null, { ip: '10.1.0.1' });
    const res = await t.attempt(`SELECT public.place_order($1, 'Fatou Diop', '781112233', 'Médina, rue 11', $2, $3::jsonb, '4827') AS v`, [IDS.MERCHANT, ZONE, cart()]);
    expect(res.error).toBe('Un acompte de 10 % est demandé pour le paiement à la livraison. Actualisez la page puis réessayez.');
    expect(await stock()).toBe(before);
  });

  it('le serveur enregistre la commande : total et acompte calculés par la base', async () => {
    const before = await stock();
    order = await insertAsServer('DEPOSIT');
    expect(order).toMatchObject({ total_amount_fcfa: 51000, payment_deposit_amount: 5100, payment_method: 'DEPOSIT', payment_status: 'PENDING', status: 'PENDING', stock_reserved: false });
    expect(await stock()).toBe(before); // vérifié, pas encore réservé
    expect(await events(order.id)).toHaveLength(0); // boutique et client pas encore prévenus
  });

  it('le reçu au retour de PayDunya montre l’acompte et l’opérateur', async () => {
    await t.as('anon');
    expect(await t.value(`SELECT public.get_order_receipt($1) AS v`, [order.id])).toMatchObject({ payment_method: 'DEPOSIT', payment_deposit_amount: 5100, payment_status: 'PENDING', payment_channel: 'wave' });
  });

  it('acompte payé : stock réservé, boutique et client prévenus une seule fois', async () => {
    const before = await stock();
    await t.as('service_role');
    const sql = `UPDATE public.orders SET payment_status = 'DEPOSIT_PAID' WHERE id = $1 AND status = 'PENDING' AND payment_status = 'PENDING' RETURNING id`;
    expect(await t.query(sql, [order.id])).toHaveLength(1);
    await t.as('service_role');
    expect(await t.query(sql, [order.id])).toHaveLength(0); // notification rejouée : rien ne change
    expect(await stock()).toBe(before - 2);
    const sent = await events(order.id);
    expect(sent.map((e) => e.event)).toEqual(['customer_order_confirmed', 'merchant_new_order']);
    expect(sent[0].payload).toMatchObject({ payment_method: 'DEPOSIT', payment_status: 'DEPOSIT_PAID', payment_deposit_amount: 5100 });
  });

  it('le livreur voit l’acompte payé pour encaisser le reste', async () => {
    await t.as('authenticated', IDS.MERCHANT);
    await t.query(`UPDATE public.orders SET status = 'PREPARING' WHERE id = $1`, [order.id]);
    await t.as('anon', null, { ip: '10.1.0.2' });
    const { token } = await t.value(`SELECT public.authenticate_driver('Chez Awa', '770000001', 'CNI-1') AS v`);
    await t.as('anon');
    const course = (await t.query(`SELECT * FROM public.get_driver_orders($1)`, [token])).find((c) => c.id === order.id);
    expect(course).toMatchObject({ payment_method: 'DEPOSIT', payment_status: 'DEPOSIT_PAID', payment_deposit_amount: 5100, total_amount_fcfa: 51000 });
  });

  it('acompte jamais payé puis commande annulée : le stock n’a pas bougé', async () => {
    const before = await stock();
    const unpaid = await insertAsServer('DEPOSIT');
    await t.as('service_role');
    await t.query(`UPDATE public.orders SET status = 'CANCELLED' WHERE id = $1`, [unpaid.id]);
    expect(await stock()).toBe(before);
  });

  it('acompte payé puis commande annulée : le stock est rendu', async () => {
    const before = await stock();
    const paid = await insertAsServer('DEPOSIT');
    await t.as('service_role');
    await t.query(`UPDATE public.orders SET payment_status = 'DEPOSIT_PAID' WHERE id = $1`, [paid.id]);
    expect(await stock()).toBe(before - 2);
    await t.as('authenticated', IDS.MERCHANT);
    await t.query(`UPDATE public.orders SET status = 'CANCELLED' WHERE id = $1`, [paid.id]);
    expect(await stock()).toBe(before);
  });

  it('refuse un acompte pour un produit dont le stock ne suffit pas', async () => {
    await t.as('service_role');
    await t.query(`UPDATE public.products SET stock = 1 WHERE id = $1`, [IDS.BOUBOU]);
    await t.as('service_role');
    const res = await t.attempt(
      `INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items, payment_method)
       VALUES ($1, 'Fatou', '781112233', 'Médina', $2, 5, $3::jsonb, 'DEPOSIT')`,
      [IDS.MERCHANT, ZONE, cart()],
    );
    expect(res.error).toMatch(/Il ne reste que 1 exemplaire de « Boubou »/);
    await t.as('service_role');
    await t.query(`UPDATE public.products SET stock = 100 WHERE id = $1`, [IDS.BOUBOU]);
  });

  it('le paiement complet Wave / Orange Money fonctionne comme avant', async () => {
    const before = await stock();
    const mm = await insertAsServer('MOBILE_MONEY', cart(), 'orange_money');
    expect(mm.payment_deposit_amount).toBeNull();
    await t.as('service_role');
    await t.query(`UPDATE public.orders SET status = 'PREPARING', payment_status = 'PAID' WHERE id = $1`, [mm.id]);
    expect(await stock()).toBe(before - 2);
  });
});
