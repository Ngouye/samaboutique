import express from 'express';
import axios from 'axios';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { DEFAULT_DELIVERY_ZONES } from '../lib/deliveryZones.js';

dotenv.config();

const router = express.Router();

// Client Supabase avec la Service Role Key (droits d'admin) : ne jamais l'exposer au navigateur.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAYDUNYA_MASTER_KEY = process.env.PAYDUNYA_MASTER_KEY;
const PAYDUNYA_PRIVATE_KEY = process.env.PAYDUNYA_PRIVATE_KEY;
const PAYDUNYA_TOKEN = process.env.PAYDUNYA_TOKEN;
const PAYDUNYA_API_URL = process.env.PAYDUNYA_API_URL || 'https://app.paydunya.com/api/v1';

const paydunyaHeaders = {
  'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
  'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
  'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
  'Content-Type': 'application/json'
};

// PayDunya signe ses notifications (IPN) avec le SHA-512 de la clé principale.
const EXPECTED_IPN_HASH = crypto.createHash('sha512').update(PAYDUNYA_MASTER_KEY || '').digest('hex');

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const MAX_QUANTITY = 100;

// Route 1: Créer une demande de paiement (Checkout)
// Le montant n'est JAMAIS pris chez le client : il est recalculé à partir des prix en base.
router.post('/create', async (req, res) => {
  try {
    const { orderDetails } = req.body || {};
    const items = orderDetails?.cartItems;

    if (!orderDetails?.merchant_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Commande invalide' });
    }
    if (!orderDetails.name || !orderDetails.phone || !orderDetails.address || !orderDetails.zone) {
      return res.status(400).json({ success: false, error: 'Coordonnées incomplètes' });
    }
    for (const item of items) {
      if (!item?.product_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
        return res.status(400).json({ success: false, error: 'Article invalide dans le panier' });
      }
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, shop_name, delivery_zones')
      .eq('id', orderDetails.merchant_id)
      .single();
    if (merchantError || !merchant) {
      return res.status(404).json({ success: false, error: 'Boutique introuvable' });
    }

    const productIds = [...new Set(items.map((i) => i.product_id))];
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price_fcfa')
      .eq('merchant_id', merchant.id)
      .in('id', productIds);
    if (productsError || !products || products.length !== productIds.length) {
      return res.status(400).json({ success: false, error: 'Produit introuvable pour cette boutique' });
    }

    const byId = new Map(products.map((p) => [p.id, p]));
    const cartItems = items.map((item) => {
      const product = byId.get(item.product_id);
      // Le libellé peut contenir la variante choisie, jamais le nom d'un autre produit.
      const name = typeof item.name === 'string' && item.name.startsWith(product.name) ? item.name.slice(0, 200) : product.name;
      return { product_id: product.id, name, price: product.price_fcfa, quantity: item.quantity };
    });

    const zones = Array.isArray(merchant.delivery_zones) && merchant.delivery_zones.length ? merchant.delivery_zones : DEFAULT_DELIVERY_ZONES;
    const zone = zones.find((z) => z.active && z.name === orderDetails.zone);
    if (!zone) {
      return res.status(400).json({ success: false, error: 'Zone de livraison invalide' });
    }

    const totalAmount = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0) + Number(zone.price);

    // 1. Sauvegarder la commande en statut 'PENDING' (le code PIN est tiré avec un générateur sûr)
    const { data: order, error: orderError } = await supabase.from('orders').insert([{
      merchant_id: merchant.id,
      customer_name: String(orderDetails.name).slice(0, 120),
      customer_phone: String(orderDetails.phone).slice(0, 40),
      customer_address: String(orderDetails.address).slice(0, 500),
      delivery_zone: zone.name,
      total_amount_fcfa: totalAmount,
      cart_items: cartItems,
      delivery_pin: crypto.randomInt(1000, 10000).toString(),
      payment_method: 'MOBILE_MONEY',
      status: 'PENDING'
    }]).select().single();

    if (orderError) throw orderError;

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const shopPath = `${frontendUrl}/boutique/${encodeURIComponent(merchant.shop_name)}`;

    // 2. Facture PayDunya : le montant est celui enregistré en base (recalculé par le trigger SQL si installé)
    const paydunyaPayload = {
      invoice: {
        total_amount: order.total_amount_fcfa,
        description: `Commande sur ${merchant.shop_name}`
      },
      store: {
        name: 'Samaboutik',
        website_url: frontendUrl
      },
      custom_data: {
        type: 'order',
        order_id: order.id
      },
      actions: {
        cancel_url: `${shopPath}?payment=cancel`,
        return_url: `${shopPath}?payment=success&orderId=${order.id}`,
        callback_url: `${backendUrl}/api/payments/webhook`
      }
    };

    const response = await axios.post(`${PAYDUNYA_API_URL}/checkout-invoice/create`, paydunyaPayload, { headers: paydunyaHeaders });

    if (response.data.response_code === '00') {
      res.json({
        success: true,
        paymentUrl: response.data.response_text,
        token: response.data.token,
        orderId: order.id
      });
    } else {
      res.status(400).json({ success: false, error: "Échec de création de la facture PayDunya" });
    }

  } catch (error) {
    console.error("Erreur serveur lors de la création du paiement :", error);
    res.status(500).json({ success: false, error: "Erreur lors de l'initialisation du paiement" });
  }
});

// Reversement automatique au marchand (95 %), appelé une seule fois par commande payée.
async function payoutMerchant(order) {
  try {
    const { data: merchant, error: merchantError } = await supabase.from('merchants')
      .select('payout_phone_number, payout_provider')
      .eq('id', order.merchant_id)
      .single();

    if (merchantError) throw merchantError;

    if (!merchant.payout_phone_number) {
      console.warn("Aucun numéro de paiement renseigné par ce vendeur. Le transfert manuel sera nécessaire.");
      return;
    }

    const commission = Math.floor(order.total_amount_fcfa * 0.05);
    const payoutAmount = order.total_amount_fcfa - commission;

    console.log(`Lancement du transfert PayDunya de ${payoutAmount} FCFA vers le vendeur...`);

    const payoutResponse = await axios.post(`${PAYDUNYA_API_URL}/direct-pay/credit-account`, {
      account_alias: merchant.payout_phone_number,
      amount: payoutAmount
    }, { headers: paydunyaHeaders });

    if (payoutResponse.data && payoutResponse.data.response_code === '00') {
      console.log(`Transfert réussi vers le vendeur ! Transaction ID: ${payoutResponse.data.transaction_id}`);
    } else {
      console.error("Échec du transfert PayDunya:", payoutResponse.data);
    }
  } catch (payoutErr) {
    console.error("Erreur lors du transfert d'argent au vendeur:", payoutErr.response ? payoutErr.response.data : payoutErr.message);
  }
}

// Route 2: Webhook PayDunya (IPN)
// On ne fait jamais confiance au contenu reçu : signature vérifiée, puis paiement reconfirmé auprès de PayDunya.
router.post('/webhook', async (req, res) => {
  try {
    // PayDunya envoie les données sous la clé `data` (formulaire ou JSON selon la configuration).
    const payload = req.body?.data || req.body || {};

    if (!PAYDUNYA_MASTER_KEY || !safeEqual(payload.hash, EXPECTED_IPN_HASH)) {
      console.warn("Webhook PayDunya rejeté : signature invalide.");
      return res.status(401).send('Signature invalide');
    }

    const token = payload.invoice?.token;
    if (!token) return res.status(400).send('Token de facture manquant');

    const { data: confirmed } = await axios.get(
      `${PAYDUNYA_API_URL}/checkout-invoice/confirm/${encodeURIComponent(token)}`,
      { headers: paydunyaHeaders }
    );

    if (confirmed?.response_code !== '00' || confirmed.status !== 'completed') {
      return res.status(200).send('Paiement non complété');
    }

    const orderId = confirmed.custom_data?.order_id || payload.custom_data?.order_id;
    if (!orderId) return res.status(400).send('Commande inconnue');

    const { data: order, error: orderError } = await supabase.from('orders')
      .select('id, merchant_id, total_amount_fcfa, status')
      .eq('id', orderId)
      .single();
    if (orderError || !order) return res.status(404).send('Commande introuvable');

    if (Number(confirmed.invoice?.total_amount) !== Number(order.total_amount_fcfa)) {
      console.error(`Montant payé (${confirmed.invoice?.total_amount}) différent du montant de la commande ${order.id} (${order.total_amount_fcfa}).`);
      await supabase.from('orders').update({ payment_status: 'AMOUNT_MISMATCH' }).eq('id', order.id);
      return res.status(200).send('Montant incohérent');
    }

    // Transition idempotente : seule une commande encore PENDING passe en préparation
    // (une notification rejouée ne déclenche donc jamais un second reversement).
    const { data: updated, error: updateError } = await supabase.from('orders')
      .update({ status: 'PREPARING', payment_status: 'PAID' })
      .eq('id', order.id)
      .eq('status', 'PENDING')
      .select('id');
    if (updateError) throw updateError;

    if (!updated?.length) {
      return res.status(200).send('Déjà traité');
    }

    console.log(`Commande ${order.id} validée et payée !`);
    await payoutMerchant(order);

    res.status(200).send('Webhook reçu');
  } catch (error) {
    console.error("Erreur Webhook :", error.response ? error.response.data : error);
    res.status(500).send("Erreur interne");
  }
});

export default router;
