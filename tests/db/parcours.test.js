// Parcours vitaux, joués sur une vraie base PostgreSQL avec les scripts SQL du projet :
// inscription, commande, livraison avec code, paiement en ligne, avis.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, IDS, cart, isDenied } from '../helpers/supabaseDb.js';

let t; // { as, query, attempt, value }
beforeAll(async () => { t = await createDatabase(); });
afterAll(async () => { await t?.close(); });

const ZONE = 'Dakar Plateau / Médina'; // 1 000 F par défaut

describe('Installation', () => {
  it('les scripts SQL s’installent dans l’ordre du guide, sans erreur', () => {
    expect(t.installErrors).toEqual([]);
  });
});

describe('Parcours 1 : inscription d’un marchand', () => {
  const NEW_ID = '44444444-4444-4444-4444-444444444444';

  it('crée la boutique et enregistre sa position GPS publique', async () => {
    await t.asAuthService(); // inscription via Supabase Auth
    await t.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'khady@test.sn', $2::jsonb)`, [
      NEW_ID, JSON.stringify({ shop_name: 'Chez Khady', phone_number: '+221781234567', location: { lat: 14.69, lng: -17.44, accuracy: 12, public: true } }),
    ]);
    await t.as('service_role');
    const [shop] = await t.query(`SELECT shop_name, phone_number FROM public.merchants WHERE id = $1`, [NEW_ID]);
    expect(shop).toEqual({ shop_name: 'Chez Khady', phone_number: '+221781234567' });
    const [loc] = await t.query(`SELECT latitude, longitude, is_public, source FROM public.merchant_locations WHERE merchant_id = $1`, [NEW_ID]);
    expect(loc).toEqual({ latitude: 14.69, longitude: -17.44, is_public: true, source: 'inscription' });
  });

  it('le marchand lit sa fiche complète, un visiteur seulement la vitrine', async () => {
    await t.as('authenticated', NEW_ID);
    expect((await t.value(`SELECT public.get_my_merchant() AS v`)).shop_name).toBe('Chez Khady');
    await t.as('anon');
    const [pub] = await t.query(`SELECT shop_name FROM public.merchants WHERE id = $1`, [NEW_ID]);
    expect(pub.shop_name).toBe('Chez Khady');
    await t.as('anon');
    expect(isDenied(await t.attempt(`SELECT payout_phone_number FROM public.merchants`))).toBe(true);
  });
});

let orderId;
describe('Parcours 2 : commande avec paiement à la livraison', () => {
  it('le client commande ; le total est recalculé côté base (prix modifié dans le navigateur ignoré)', async () => {
    await t.as('anon', null, { ip: '10.0.0.1' });
    const receipt = await t.value(`SELECT public.place_order($1, 'Fatou Diop', '781112233', 'Médina, rue 11', $2, $3::jsonb, '4827') AS v`, [IDS.MERCHANT, ZONE, cart()]);
    orderId = receipt.id;
    expect(receipt.total_amount_fcfa).toBe(25000 * 2 + 1000);
    expect(receipt.cart_items[0].price).toBe(25000);
    expect(receipt.status).toBe('PENDING');
    expect(receipt.payment_method).toBe('ON_DELIVERY');
    expect(receipt.delivery_pin).toBe('4827');
  });

  it('refuse les commandes invalides', async () => {
    const tryOrder = async (args) => {
      await t.as('anon', null, { ip: '10.0.0.2' });
      return t.attempt(`SELECT public.place_order($1, $2, $3, $4, $5, $6::jsonb, '1111') AS v`, args);
    };
    expect((await tryOrder([IDS.MERCHANT, 'Fatou', '781112233', 'Médina', ZONE, cart(IDS.MONTRE)])).error).toMatch(/Produit introuvable/);
    expect((await tryOrder([IDS.MERCHANT, 'Fatou', '781112233', 'Médina', 'Zone inventée', cart()])).error).toMatch(/Zone de livraison invalide/);
    expect((await tryOrder([IDS.MERCHANT, 'F', '12', 'Médina', ZONE, cart()])).error).toMatch(/Coordonnées invalides/);
    expect((await tryOrder([IDS.MERCHANT, 'Fatou', '781112233', 'Médina', ZONE, cart(IDS.BOUBOU, { quantity: 0 })])).error).toMatch(/Quantité invalide/);
  });

  it('la commande n’est visible que par sa boutique', async () => {
    await t.as('anon');
    expect(isDenied(await t.attempt(`SELECT * FROM public.orders`))).toBe(true);
    await t.as('authenticated', IDS.MERCHANT);
    expect(await t.query(`SELECT id FROM public.orders WHERE id = $1`, [orderId])).toHaveLength(1);
    await t.as('authenticated', IDS.OTHER);
    expect(await t.query(`SELECT id FROM public.orders WHERE id = $1`, [orderId])).toHaveLength(0);
  });

  it('le client suit sa commande avec son téléphone et son code', async () => {
    await t.as('anon', null, { ip: '10.0.0.3' });
    const ok = await t.value(`SELECT public.track_order('781112233', '4827') AS v`);
    expect(ok.ok).toBe(true);
    expect(ok.order.status).toBe('PENDING');
    await t.as('anon', null, { ip: '10.0.0.3' });
    expect((await t.value(`SELECT public.track_order('781112233', '0000') AS v`)).ok).toBe(false);
  });

  it('bloque les essais de codes au hasard (5 erreurs par numéro)', async () => {
    for (let i = 0; i < 5; i++) {
      await t.as('anon', null, { ip: '10.0.1.' + i });
      await t.value(`SELECT public.track_order('760000009', '000${i}') AS v`);
    }
    await t.as('anon', null, { ip: '10.0.1.9' });
    expect((await t.value(`SELECT public.track_order('760000009', '1234') AS v`)).error).toMatch(/Trop de tentatives/);
  });

  it('limite les commandes en rafale depuis une même adresse (20 par heure)', async () => {
    for (let i = 0; i < 20; i++) {
      await t.as('anon', null, { ip: '10.0.2.1' });
      await t.query(`SELECT public.place_order($1, 'Robot', '700000000', 'Ici', $2, $3::jsonb, '1111')`, [IDS.MERCHANT, ZONE, cart(IDS.BOUBOU, { quantity: 1 })]);
    }
    await t.as('anon', null, { ip: '10.0.2.1' });
    expect((await t.attempt(`SELECT public.place_order($1, 'Robot', '700000000', 'Ici', $2, $3::jsonb, '1111')`, [IDS.MERCHANT, ZONE, cart()])).error).toMatch(/Trop de commandes/);
  });
});

let token, token2;
describe('Parcours 3 : livraison avec code PIN', () => {
  it('la boutique passe la commande en préparation', async () => {
    await t.as('authenticated', IDS.MERCHANT);
    await t.query(`UPDATE public.orders SET status = 'PREPARING' WHERE id = $1`, [orderId]);
    await t.as('service_role');
    expect((await t.query(`SELECT status FROM public.orders WHERE id = $1`, [orderId]))[0].status).toBe('PREPARING');
  });

  it('le livreur se connecte avec son téléphone et sa CNI', async () => {
    await t.as('anon', null, { ip: '10.0.3.1' });
    expect((await t.value(`SELECT public.authenticate_driver('Chez Awa', '770000001', 'MAUVAISE') AS v`)).ok).toBe(false);
    await t.as('anon', null, { ip: '10.0.3.1' });
    const login = await t.value(`SELECT public.authenticate_driver('chez awa', '770000001', 'CNI-1') AS v`);
    expect(login).toMatchObject({ ok: true, name: 'Mamadou' });
    token = login.token;
    await t.as('anon', null, { ip: '10.0.3.2' });
    token2 = (await t.value(`SELECT public.authenticate_driver('Chez Awa', '770000002', 'CNI-2') AS v`)).token;
  });

  it('voit la course à prendre, sans le téléphone du client', async () => {
    await t.as('anon');
    const courses = await t.query(`SELECT id, customer_phone, status FROM public.get_driver_orders($1)`, [token]);
    const course = courses.find((c) => c.id === orderId);
    expect(course).toMatchObject({ status: 'PREPARING', customer_phone: null });
  });

  it('accepte la course ; un autre livreur ne peut plus la prendre', async () => {
    await t.as('anon');
    expect(await t.value(`SELECT public.assign_order_to_driver($1, $2) AS v`, [token, orderId])).toBe(true);
    await t.as('anon');
    expect((await t.attempt(`SELECT public.assign_order_to_driver($1, $2)`, [token2, orderId])).error).toMatch(/déjà été acceptée/);
    await t.as('anon');
    const course = (await t.query(`SELECT customer_phone, status FROM public.get_driver_orders($1)`, [token])).find(Boolean);
    expect(course).toMatchObject({ status: 'IN_TRANSIT', customer_phone: '781112233' });
  });

  it('ne peut pas prendre une deuxième course avant d’avoir terminé', async () => {
    await t.as('service_role');
    const [other] = await t.query(`INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items) VALUES ($1, 'Awa', '760000001', 'Ouakam', $2, 0, $3::jsonb) RETURNING id`, [IDS.MERCHANT, ZONE, cart()]);
    await t.query(`UPDATE public.orders SET status = 'PREPARING' WHERE id = $1`, [other.id]);
    await t.as('anon');
    expect((await t.attempt(`SELECT public.assign_order_to_driver($1, $2)`, [token, other.id])).error).toMatch(/déjà une course en cours/);
  });

  it('ne livre qu’avec le bon code PIN du client', async () => {
    await t.as('anon');
    expect(await t.value(`SELECT public.mark_order_delivered($1, $2, '0000') AS v`, [token, orderId])).toMatchObject({ ok: false, error: 'Code incorrect !' });
    await t.as('anon');
    expect((await t.attempt(`SELECT public.mark_order_delivered($1, $2, '4827')`, [token2, orderId])).error).toMatch(/pas assignée/);
    await t.as('anon');
    expect(await t.value(`SELECT public.mark_order_delivered($1, $2, '4827') AS v`, [token, orderId])).toEqual({ ok: true });
    await t.as('service_role');
    const [order] = await t.query(`SELECT status, delivered_at FROM public.orders WHERE id = $1`, [orderId]);
    expect(order.status).toBe('DELIVERED');
    expect(order.delivered_at).not.toBeNull();
  });

  it('le client voit sa commande livrée', async () => {
    await t.as('anon', null, { ip: '10.0.3.9' });
    expect((await t.value(`SELECT public.track_order('781112233', '4827') AS v`)).order.status).toBe('DELIVERED');
  });

  it('après déconnexion, le jeton du livreur ne sert plus à rien', async () => {
    await t.as('anon');
    await t.query(`SELECT public.logout_driver($1)`, [token]);
    await t.as('anon');
    expect((await t.attempt(`SELECT * FROM public.get_driver_orders($1)`, [token])).error).toMatch(/SESSION_EXPIREE/);
  });
});

describe('Parcours 4 : paiement en ligne (partie base de données)', () => {
  let paidId;
  it('la commande créée par le serveur garde le prix de la base', async () => {
    await t.as('service_role');
    const [row] = await t.query(`INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items, payment_method) VALUES ($1, 'Awa', '760000001', 'Ouakam', $2, 5, $3::jsonb, 'MOBILE_MONEY') RETURNING id, total_amount_fcfa, status`, [IDS.MERCHANT, ZONE, cart()]);
    paidId = row.id;
    expect(row).toMatchObject({ total_amount_fcfa: 51000, status: 'PENDING' });
  });

  it('la validation du paiement ne peut avoir lieu qu’une fois (pas de double reversement)', async () => {
    await t.as('service_role');
    expect(await t.query(`UPDATE public.orders SET status = 'PREPARING', payment_status = 'PAID' WHERE id = $1 AND status = 'PENDING' RETURNING id`, [paidId])).toHaveLength(1);
    await t.as('service_role');
    expect(await t.query(`UPDATE public.orders SET status = 'PREPARING', payment_status = 'PAID' WHERE id = $1 AND status = 'PENDING' RETURNING id`, [paidId])).toHaveLength(0);
  });

  it('le reçu s’affiche au retour du paiement, puis expire au bout de 2 heures', async () => {
    await t.as('anon');
    expect((await t.value(`SELECT public.get_order_receipt($1) AS v`, [paidId])).id).toBe(paidId);
    await t.as('anon');
    expect(await t.value(`SELECT public.get_order_receipt($1) AS v`, [orderId])).toBeNull(); // paiement à la livraison : jamais
    await t.as('service_role');
    await t.query(`UPDATE public.orders SET created_at = now() - interval '3 hours' WHERE id = $1`, [paidId]);
    await t.as('anon');
    expect(await t.value(`SELECT public.get_order_receipt($1) AS v`, [paidId])).toBeNull();
  });
});

describe('Parcours 5 : avis clients', () => {
  it('l’avis d’un client livré reçoit le badge « achat vérifié »', async () => {
    await t.as('anon', null, { ip: '10.0.4.1' });
    expect((await t.value(`SELECT public.submit_review($1, 5, 'Très beau boubou', 'Fatou', $2) AS v`, [IDS.BOUBOU, orderId])).ok).toBe(true);
    await t.as('anon', null, { ip: '10.0.4.2' });
    expect((await t.value(`SELECT public.submit_review($1, 4, 'Joli, je recommande', 'Moussa') AS v`, [IDS.BOUBOU])).ok).toBe(true);
    await t.as('anon');
    const reviews = await t.query(`SELECT customer_name, verified FROM public.reviews ORDER BY customer_name`);
    expect(reviews).toEqual([{ customer_name: 'Fatou', verified: true }, { customer_name: 'Moussa', verified: false }]);
  });

  it('refuse les avis vides, les notes invalides et le spam', async () => {
    await t.as('anon', null, { ip: '10.0.4.3' });
    expect((await t.value(`SELECT public.submit_review($1, 9, 'Note impossible', 'X') AS v`, [IDS.BOUBOU])).ok).toBe(false);
    await t.as('anon', null, { ip: '10.0.4.3' });
    expect((await t.value(`SELECT public.submit_review($1, 5, 'ok', 'X') AS v`, [IDS.BOUBOU])).ok).toBe(false);
    for (let i = 0; i < 3; i++) {
      await t.as('anon', null, { ip: '10.0.4.4' });
      await t.value(`SELECT public.submit_review($1, 5, 'Avis numéro ${i}', 'Spam') AS v`, [IDS.BOUBOU]);
    }
    await t.as('anon', null, { ip: '10.0.4.4' });
    expect((await t.value(`SELECT public.submit_review($1, 5, 'Encore un avis', 'Spam') AS v`, [IDS.BOUBOU])).error).toMatch(/plusieurs avis/);
  });
});

describe('Parcours 6 : le stock suit les commandes', () => {
  const PAGNE = 'aaaaaaaa-0000-0000-0000-000000000003';
  const stock = async () => { await t.as('service_role'); return (await t.query(`SELECT stock FROM public.products WHERE id = $1`, [PAGNE]))[0].stock; };
  const order = async (ip, items) => {
    await t.as('anon', null, { ip });
    return t.attempt(`SELECT public.place_order($1, 'Fatou Diop', '781112233', 'Médina, rue 11', $2, $3::jsonb, '4827') AS v`, [IDS.MERCHANT, ZONE, JSON.stringify(items)]);
  };
  const line = (quantity, name = 'Pagne') => ({ product_id: PAGNE, name, price: 1, quantity });
  const setStatus = async (id, status) => { await t.as('authenticated', IDS.MERCHANT); await t.query(`UPDATE public.orders SET status = $2 WHERE id = $1`, [id, status]); };
  let codId;

  beforeAll(async () => {
    await t.asAuthService();
    await t.query(`INSERT INTO public.products (id, merchant_id, name, price_fcfa, stock, category) VALUES ($1, $2, 'Pagne', 8000, 3, 'Vêtements')`, [PAGNE, IDS.MERCHANT]);
  });

  it('paiement à la livraison : le stock baisse dès la commande', async () => {
    const { rows } = await order('10.0.6.1', [line(2)]);
    codId = rows[0].v.id;
    expect(await stock()).toBe(1);
  });

  it('refuse une commande qui dépasse le stock, variantes comprises, sans rien modifier', async () => {
    expect((await order('10.0.6.2', [line(2)])).error).toBe('Il ne reste que 1 exemplaire de « Pagne ». Réduisez la quantité dans le panier.');
    expect((await order('10.0.6.2', [line(1, 'Pagne (Rouge)'), line(1, 'Pagne (Bleu)')])).error).toMatch(/Il ne reste que 1 exemplaire/);
    expect(await stock()).toBe(1);
    await t.as('service_role');
    expect(await t.query(`SELECT id FROM public.orders WHERE cart_items @> $1::jsonb`, [JSON.stringify([{ product_id: PAGNE }])])).toHaveLength(1);
  });

  it('la dernière pièce part une seule fois, ensuite le produit est épuisé', async () => {
    expect((await order('10.0.6.3', [line(1)])).error).toBeUndefined();
    expect(await stock()).toBe(0);
    expect((await order('10.0.6.3', [line(1)])).error).toBe('Désolé, « Pagne » est épuisé. Retirez-le du panier pour continuer.');
  });

  it('une commande annulée rend son stock, une seule fois ; réactivée, elle le reprend', async () => {
    await setStatus(codId, 'CANCELLED');
    expect(await stock()).toBe(2);
    await t.as('authenticated', IDS.MERCHANT);
    await t.query(`UPDATE public.orders SET customer_address = 'Médina, rue 12' WHERE id = $1`, [codId]); // reste annulée
    expect(await stock()).toBe(2);
    await setStatus(codId, 'PREPARING');
    expect(await stock()).toBe(0);
    await setStatus(codId, 'DELIVERED');
    expect(await stock()).toBe(0);
  });

  it('Wave / Orange Money : stock vérifié à la commande, déduit seulement une fois payé', async () => {
    await t.asAuthService();
    await t.query(`UPDATE public.products SET stock = 3 WHERE id = $1`, [PAGNE]);
    const insert = async (quantity) => {
      await t.as('service_role');
      return t.attempt(`INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items, payment_method) VALUES ($1, 'Awa', '760000001', 'Ouakam', $2, 0, $3::jsonb, 'MOBILE_MONEY') RETURNING id`, [IDS.MERCHANT, ZONE, JSON.stringify([line(quantity)])]);
    };
    expect((await insert(4)).error).toMatch(/Il ne reste que 3 exemplaires de « Pagne »/);
    const paid = (await insert(2)).rows[0].id;
    await insert(1); // paiement abandonné : ne bloque rien
    expect(await stock()).toBe(3);
    await t.as('service_role');
    await t.query(`UPDATE public.orders SET status = 'PREPARING', payment_status = 'PAID' WHERE id = $1 AND status = 'PENDING'`, [paid]);
    expect(await stock()).toBe(1);
  });

  it('la colonne « stock déduit » ne se modifie pas à la main, et les anciennes commandes ne touchent pas au stock', async () => {
    await t.as('authenticated', IDS.MERCHANT);
    await t.query(`UPDATE public.orders SET stock_reserved = false WHERE id = $1`, [codId]);
    await t.as('service_role');
    expect((await t.query(`SELECT stock_reserved FROM public.orders WHERE id = $1`, [codId]))[0].stock_reserved).toBe(true);

    // Commande passée avant l'installation du script : stock_reserved vide
    await t.asAuthService();
    await t.db.exec(`ALTER TABLE public.orders DISABLE TRIGGER orders_sync_stock; UPDATE public.orders SET stock_reserved = NULL WHERE id = '${codId}'; ALTER TABLE public.orders ENABLE TRIGGER orders_sync_stock;`);
    const before = await stock();
    await setStatus(codId, 'CANCELLED');
    expect(await stock()).toBe(before);
  });

  it('les fonctions de stock ne sont pas appelables par les visiteurs', async () => {
    await t.as('anon');
    expect(isDenied(await t.attempt(`SELECT public.apply_order_stock($1, $2::jsonb, 'give_back')`, [IDS.MERCHANT, JSON.stringify([line(50)])]))).toBe(true);
    await t.as('anon');
    expect(isDenied(await t.attempt(`SELECT public.adjust_product_stock($1, 5)`, [PAGNE]))).toBe(true);
  });

  it('réassort rapide +1 / −1 : relatif, jamais sous zéro, seulement sur ses propres produits', async () => {
    const adjust = async (delta, merchant = IDS.MERCHANT) => {
      await t.as('authenticated', merchant);
      return t.attempt(`SELECT public.adjust_product_stock($1, $2) AS v`, [PAGNE, delta]);
    };
    await t.asAuthService();
    await t.query(`UPDATE public.products SET stock = 1 WHERE id = $1`, [PAGNE]);
    expect((await adjust(3)).rows[0].v).toBe(4);
    expect((await adjust(-10)).rows[0].v).toBe(0);
    // Stock négatif (vente en trop) : un retrait ne l'aggrave pas, un ajout le corrige.
    await t.asAuthService();
    await t.query(`UPDATE public.products SET stock = -1 WHERE id = $1`, [PAGNE]);
    expect((await adjust(-1)).rows[0].v).toBe(-1);
    expect((await adjust(2)).rows[0].v).toBe(1);
    expect((await adjust(5, IDS.OTHER)).error).toMatch(/Produit introuvable/);
    expect((await adjust(0)).error).toMatch(/Quantité invalide/);
    expect(await stock()).toBe(1);
  });
});

describe('Parcours 7 : annuaire des boutiques', () => {
  it('chaque fiche donne le numéro WhatsApp et l’adresse de la boutique', async () => {
    await t.asAuthService();
    await t.query(`UPDATE public.merchants SET address = 'Sicap Liberté 6' WHERE id = '44444444-4444-4444-4444-444444444444'`);
    await t.query(`INSERT INTO public.products (merchant_id, name, price_fcfa, stock, category) VALUES ('44444444-4444-4444-4444-444444444444', 'Thiouraye', 3000, 5, 'Beauté & Santé')`);
    await t.as('anon');
    const shops = await t.query(`SELECT shop_name, phone_number, address, featured FROM public.public_shops_directory()`);
    expect(shops).toEqual([{ shop_name: 'Chez Khady', phone_number: '+221781234567', address: 'Sicap Liberté 6', featured: false }]);
  });
});

describe('Parcours 8 : opérateur de paiement mobile et assistant IA', () => {
  const insertMobileOrder = async (channel) => {
    await t.as('service_role');
    return t.attempt(
      `INSERT INTO public.orders (merchant_id, customer_name, customer_phone, customer_address, delivery_zone, total_amount_fcfa, cart_items, payment_method, payment_channel)
       VALUES ($1, 'Awa', '760000001', 'Ouakam', $2, 0, $3::jsonb, 'MOBILE_MONEY', $4) RETURNING payment_channel`,
      [IDS.MERCHANT, ZONE, cart(IDS.BOUBOU, { quantity: 1 }), channel],
    );
  };

  it('la commande garde l’opérateur choisi (Wave, Orange Money, Free Money, Wizall)', async () => {
    for (const channel of ['wave', 'orange_money', 'free_money', 'wizall']) {
      expect((await insertMobileOrder(channel)).rows[0].payment_channel).toBe(channel);
    }
    expect((await insertMobileOrder('bitcoin')).error).toMatch(/orders_payment_channel_check/);
  });

  it('le compteur d’utilisation de l’IA n’est accessible qu’au serveur', async () => {
    await t.as('service_role');
    await t.query(`INSERT INTO public.ai_usage (merchant_id, kind) VALUES ($1, 'product_sheet'), ($1, 'studio_photo')`, [IDS.MERCHANT]);
    await t.as('service_role');
    expect(await t.query(`SELECT kind FROM public.ai_usage WHERE merchant_id = $1 ORDER BY kind`, [IDS.MERCHANT])).toEqual([{ kind: 'product_sheet' }, { kind: 'studio_photo' }]);
    await t.as('authenticated', IDS.MERCHANT);
    expect(isDenied(await t.attempt(`SELECT * FROM public.ai_usage`))).toBe(true);
    await t.as('authenticated', IDS.MERCHANT);
    expect(isDenied(await t.attempt(`INSERT INTO public.ai_usage (merchant_id, kind) VALUES ($1, 'studio_photo')`, [IDS.MERCHANT]))).toBe(true);
    await t.as('anon');
    expect(isDenied(await t.attempt(`SELECT * FROM public.ai_usage`))).toBe(true);
  });
});
