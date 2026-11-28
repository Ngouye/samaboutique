// Commande depuis l'application : mêmes chemins que la vitrine du site (src/pages/PublicShop.jsx).
//  - Wave / Orange Money / Free Money / Wizall : le serveur crée la commande et la page PayDunya ;
//  - à la livraison : acompte de 10 % payé en ligne (même serveur), le reste au livreur ;
//    tant que acompte_livraison.sql n'est pas installé, commande à la livraison classique (place_order).
// Les montants sont toujours recalculés par la base : le prix envoyé n'est qu'indicatif.
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { store } from './storage';
import { supabase, configError } from './supabase';
import { canonicalPhone } from './shared';
import { addressWithGps } from './profile';
import { COLORS } from '../theme';

const API = process.env.EXPO_PUBLIC_COMMANDES_API_URL;
const NETWORK = 'Pas de connexion internet. Vérifiez votre réseau puis réessayez.';

// L'acompte est-il installé dans la base ? (même vérification que le site ; en cas de doute, oui : le serveur tranche)
let depositCheck = null;
export function depositAvailable() {
  if (!depositCheck) {
    depositCheck = supabase.rpc('order_deposit', { p_total: 0 })
      .then(({ error }) => !error || error.code !== 'PGRST202', () => true);
  }
  return depositCheck;
}

const cartItemsOf = (lines) => lines.map((l) => ({
  product_id: l.product.id,
  name: l.variant ? `${l.product.name} (${l.variant})` : l.product.name,
  price: l.product.price_fcfa,
  quantity: l.quantity,
}));

// Reçus déjà connus (commande à la livraison sans paiement en ligne : pas de reçu à redemander).
const receipts = new Map();
export const rememberReceipt = (receipt) => receipt?.id && receipts.set(String(receipt.id), receipt);
export const cachedReceipt = (id) => receipts.get(String(id)) || null;

// Pages de paiement ouvertes, pour pouvoir y revenir depuis l'écran de confirmation.
const paymentUrls = new Map();
export const paymentUrlOf = (orderId) => paymentUrls.get(String(orderId)) || null;

// Adresse de retour dans l'application après le paiement (exp://… avec Expo Go, samaboutik://… une fois installée).
// PayDunya renvoie vers la page /retour-app du site, qui rouvre l'application sur l'écran « paiement-termine ».
export const paymentReturnUrl = () => Linking.createURL('paiement-termine');

// Boutique de chaque commande en cours de paiement (si l'application a été fermée pendant le paiement).
export const shopOfOrder = (orderId) => store.get('orderShops', {})[String(orderId)] || '';
function rememberOrderShop(orderId, shopName) {
  const all = store.get('orderShops', {});
  const recent = Object.fromEntries(Object.entries(all).slice(-19));
  store.set('orderShops', { ...recent, [String(orderId)]: shopName });
}

async function placeOnDelivery({ merchant, lines, form }) {
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const { data, error } = await supabase.rpc('place_order', {
    p_merchant_id: merchant.id,
    p_customer_name: form.name.trim(),
    p_customer_phone: canonicalPhone(form.phone),
    p_customer_address: addressWithGps(form.address, form.gps),
    p_delivery_zone: form.zone,
    p_cart_items: cartItemsOf(lines),
    p_delivery_pin: pin,
  });
  if (error) throw new Error(error.message || 'La commande n’a pas pu être enregistrée.');
  rememberReceipt(data);
  return { kind: 'placed', orderId: data.id };
}

// payment : 'ON_DELIVERY' ou un opérateur (wave, orange_money, free_money, wizall).
// channel : opérateur choisi pour l'acompte quand payment vaut 'ON_DELIVERY'.
export async function createOrder({ merchant, lines, form, payment, channel }) {
  if (configError) throw new Error(configError);
  const useDeposit = payment === 'ON_DELIVERY' && await depositAvailable();
  if (payment === 'ON_DELIVERY' && !useDeposit) return placeOnDelivery({ merchant, lines, form });

  const down = useDeposit
    ? "Le paiement de l'acompte est momentanément indisponible. Réessayez dans un instant."
    : 'Le paiement en ligne est momentanément indisponible. Réessayez dans un instant ou choisissez le paiement à la livraison.';
  let response;
  try {
    response = await fetch(`${API}/api/payments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderDetails: {
          merchant_id: merchant.id,
          name: form.name.trim(),
          phone: canonicalPhone(form.phone),
          address: addressWithGps(form.address, form.gps),
          zone: form.zone,
          cartItems: cartItemsOf(lines),
          channel: useDeposit ? channel : payment,
          ...(useDeposit ? { mode: 'deposit' } : {}),
          appReturnUrl: paymentReturnUrl(),
        },
      }),
    });
  } catch {
    throw new Error(NETWORK);
  }
  const result = await response.json().catch(() => ({}));
  if (result.success && result.paymentUrl) {
    paymentUrls.set(String(result.orderId), result.paymentUrl);
    rememberOrderShop(result.orderId, merchant.shop_name);
    return { kind: 'payment', orderId: result.orderId, paymentUrl: result.paymentUrl, amount: result.amount };
  }
  if (useDeposit && result.code === 'DEPOSIT_UNAVAILABLE') {
    depositCheck = Promise.resolve(false);
    return placeOnDelivery({ merchant, lines, form });
  }
  throw new Error(result.error || down);
}

// Page sécurisée PayDunya (Wave, Orange Money…) dans un navigateur intégré, qui se ferme tout seul
// quand PayDunya renvoie vers l'application (paiement terminé ou annulé).
export function openPayment(url) {
  return WebBrowser.openAuthSessionAsync(url, paymentReturnUrl(), { toolbarColor: COLORS.ink, controlsColor: '#ffffff', showTitle: true });
}

// Reçu à jour (paiement en ligne ou acompte, commandes de moins de 2 h) ; null si introuvable.
export async function fetchReceipt(orderId) {
  const { data, error } = await supabase.rpc('get_order_receipt', { p_order_id: orderId });
  if (error) throw error;
  if (data) rememberReceipt(data);
  return data || cachedReceipt(orderId);
}

// Paiement confirmé par PayDunya ?
export const isPaid = (receipt) => ['PAID', 'DEPOSIT_PAID'].includes(receipt?.payment_status)
  || (receipt?.payment_method === 'ON_DELIVERY');
