// Textes des messages WhatsApp. Chaque événement fournit :
//  - text     : message complet (fournisseur UltraMsg) ;
//  - template : nom du modèle Meta et ses variables {{1}}, {{2}}… dans l'ordre (GUIDE_NOUVELLES_FONCTIONNALITES.md).
import { formatFcfa } from './catalog.js';
import { frontendUrl, shopUrl } from './supabase.js';

const PREFIX = process.env.WHATSAPP_TEMPLATE_PREFIX || 'samaboutik_';

const addressOnly = (address) => String(address || '').split(' || GPS: ')[0].trim();
const gpsLink = (address) => (String(address || '').includes('|| GPS: ') ? String(address).split('|| GPS: ')[1].trim() : null);

function itemsSummary(items, max = 300) {
  const text = (Array.isArray(items) ? items : [])
    .map((item) => `${item.quantity}× ${item.name}`)
    .join(', ');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text || '-';
}

const paymentLabel = (p) => (p.payment_method === 'MOBILE_MONEY' ? 'déjà payé (Wave / Orange Money)' : 'à payer à la livraison');
const trackingLink = (p) => `${shopUrl(p.shop_name)}?suivi=${encodeURIComponent(p.customer_phone || '')}`;

const BUILDERS = {
  merchant_new_order: (p) => {
    const gps = gpsLink(p.customer_address);
    return {
      text: [
        `🛍️ *Nouvelle commande sur ${p.shop_name} !*`,
        `Réf. #${p.order_ref}`,
        '',
        `👤 ${p.customer_name} · 📞 ${p.customer_phone}`,
        `📍 ${addressOnly(p.customer_address)} (${p.delivery_zone})`,
        gps ? `🗺️ Position GPS : ${gps}` : null,
        `📦 ${itemsSummary(p.cart_items)}`,
        `💰 Total : *${formatFcfa(p.total_amount_fcfa)}* — ${paymentLabel(p)}`,
        '',
        `👉 Gérez-la ici : ${frontendUrl()}/dashboard`,
      ].filter((line) => line !== null).join('\n'),
      template: {
        name: `${PREFIX}nouvelle_commande`,
        params: [p.shop_name, p.order_ref, p.customer_name, p.customer_phone, itemsSummary(p.cart_items), formatFcfa(p.total_amount_fcfa), paymentLabel(p), `${addressOnly(p.customer_address)} (${p.delivery_zone})`],
      },
    };
  },

  customer_order_confirmed: (p) => ({
    text: [
      `Bonjour ${p.customer_name} 👋`,
      `Votre commande #${p.order_ref} chez *${p.shop_name}* est bien reçue ✅`,
      '',
      `📦 ${itemsSummary(p.cart_items)}`,
      `💰 Total : *${formatFcfa(p.total_amount_fcfa)}* (${paymentLabel(p)})`,
      '',
      `🔐 Votre code de livraison : *${p.delivery_pin}*`,
      'Donnez-le au livreur seulement quand vous avez reçu votre colis.',
      '',
      `📍 Suivre ma commande : ${trackingLink(p)}`,
      'Jërëjëf ! 🙏',
    ].join('\n'),
    template: {
      name: `${PREFIX}commande_confirmee`,
      params: [p.customer_name, p.order_ref, p.shop_name, formatFcfa(p.total_amount_fcfa), paymentLabel(p), p.delivery_pin, trackingLink(p)],
    },
  }),

  customer_in_transit: (p) => {
    const driver = p.driver_name ? `${p.driver_name}${p.driver_phone ? ` (${p.driver_phone})` : ''}` : 'notre livreur';
    return {
      text: [
        `🛵 Votre commande #${p.order_ref} de *${p.shop_name}* est en route !`,
        `Livreur : ${driver}`,
        '',
        `📍 Suivez-le en direct : ${trackingLink(p)}`,
        `🔐 Préparez votre code : *${p.delivery_pin}*`,
      ].join('\n'),
      template: {
        name: `${PREFIX}commande_en_route`,
        params: [p.order_ref, p.shop_name, driver, trackingLink(p), p.delivery_pin],
      },
    };
  },

  customer_delivered: (p) => ({
    text: [
      `✅ Commande #${p.order_ref} livrée ! Merci d'avoir choisi *${p.shop_name}* 🙏`,
      '',
      `⭐ Donnez votre avis ou recommandez : ${shopUrl(p.shop_name)}`,
      'Jërëjëf, ba beneen yoon !',
    ].join('\n'),
    template: {
      name: `${PREFIX}commande_livree`,
      params: [p.order_ref, p.shop_name, shopUrl(p.shop_name)],
    },
  }),

  customer_cancelled: (p) => ({
    text: [
      `❌ Votre commande #${p.order_ref} chez *${p.shop_name}* a été annulée.`,
      p.shop_phone ? `Pour toute question, contactez la boutique : ${p.shop_phone}` : 'Pour toute question, contactez la boutique.',
    ].join('\n'),
    template: {
      name: `${PREFIX}commande_annulee`,
      params: [p.order_ref, p.shop_name, p.shop_phone || '-'],
    },
  }),
};

export function buildNotificationMessage(event, payload) {
  const build = BUILDERS[event];
  return build ? build(payload || {}) : null;
}
