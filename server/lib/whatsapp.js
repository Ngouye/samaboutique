// Envoi des messages WhatsApp. Deux fournisseurs possibles (variable WHATSAPP_PROVIDER) :
//  - « meta »     : API officielle WhatsApp Cloud (Meta). Les messages partent sous forme de
//                   modèles validés par Meta (voir GUIDE_NOUVELLES_FONCTIONNALITES.md).
//  - « ultramsg » : passerelle UltraMsg reliée à un numéro WhatsApp classique, texte libre.
import dotenv from 'dotenv';

dotenv.config();

const PROVIDER = (process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase();
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'fr';

export function whatsappProvider() {
  if (PROVIDER === 'meta' && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) return 'meta';
  if (PROVIDER === 'ultramsg' && process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) return 'ultramsg';
  return null;
}

// Numéro au format international sans « + » (ex. 221771234567). Les numéros sénégalais
// à 9 chiffres reçoivent l'indicatif 221. Renvoie null si le numéro est inutilisable.
export function toWhatsAppNumber(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && /^[37]/.test(digits)) digits = `221${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

// Meta refuse les retours à la ligne, tabulations et longues suites d'espaces dans les variables.
const templateParam = (value) => String(value ?? '-').replace(/[\r\n\t]+/g, ' · ').replace(/ {4,}/g, '   ').trim().slice(0, 900) || '-';

class WhatsAppError extends Error {
  constructor(message, { retryable = true } = {}) {
    super(message);
    this.retryable = retryable;
  }
}

async function sendWithMeta(to, message) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: message.template.name,
        language: { code: TEMPLATE_LANG },
        components: [{ type: 'body', parameters: message.template.params.map((p) => ({ type: 'text', text: templateParam(p) })) }],
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // 4xx (hors 429) : modèle inconnu, numéro invalide… réessayer ne changera rien.
    throw new WhatsAppError(data?.error?.message || `Meta ${response.status}`, { retryable: response.status === 429 || response.status >= 500 });
  }
  return { id: data?.messages?.[0]?.id || null };
}

async function sendWithUltraMsg(to, message) {
  const response = await fetch(`https://api.ultramsg.com/${encodeURIComponent(process.env.ULTRAMSG_INSTANCE_ID)}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: process.env.ULTRAMSG_TOKEN, to: `+${to}`, body: message.text }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error || String(data?.sent) !== 'true') {
    throw new WhatsAppError(typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error || data).slice(0, 300) || `UltraMsg ${response.status}`);
  }
  return { id: data?.id ? String(data.id) : null };
}

export async function sendWhatsApp(to, message) {
  const provider = whatsappProvider();
  if (provider === 'meta') return sendWithMeta(to, message);
  if (provider === 'ultramsg') return sendWithUltraMsg(to, message);
  throw new WhatsAppError('WhatsApp non configuré', { retryable: false });
}
