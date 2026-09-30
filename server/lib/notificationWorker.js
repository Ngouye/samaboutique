// Envoi en arrière-plan des notifications WhatsApp placées dans la file par la base
// (table notification_outbox, voir new_features.sql). Chaque message est réservé par
// claim_notifications() : même avec plusieurs serveurs, il ne part jamais deux fois.
import { supabaseAdmin } from './supabase.js';
import { whatsappProvider, toWhatsAppNumber, sendWhatsApp } from './whatsapp.js';
import { buildNotificationMessage } from './notificationMessages.js';

const POLL_MS = 5000;
const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MIN = [1, 5, 15, 60]; // après le 1er, 2e, 3e, 4e échec

async function finish(id, fields) {
  const { error } = await supabaseAdmin.from('notification_outbox').update(fields).eq('id', id);
  if (error) console.error(`Notification ${id} : mise à jour impossible`, error.message);
}

async function deliver(notification) {
  const to = toWhatsAppNumber(notification.recipient);
  const message = buildNotificationMessage(notification.event, notification.payload);
  if (!to || !message) {
    return finish(notification.id, { status: 'failed', last_error: !to ? 'Numéro WhatsApp invalide' : 'Événement inconnu' });
  }

  try {
    const { id } = await sendWhatsApp(to, message);
    await finish(notification.id, { status: 'sent', sent_at: new Date().toISOString(), provider_message_id: id, last_error: null });
  } catch (err) {
    const giveUp = err.retryable === false || notification.attempts >= MAX_ATTEMPTS;
    const delayMin = RETRY_DELAYS_MIN[Math.min(notification.attempts, RETRY_DELAYS_MIN.length) - 1] || 60;
    await finish(notification.id, {
      status: giveUp ? 'failed' : 'pending',
      last_error: String(err.message || err).slice(0, 500),
      next_attempt_at: new Date(Date.now() + delayMin * 60000).toISOString(),
    });
    console.warn(`WhatsApp ${notification.event} #${notification.id} : ${giveUp ? 'abandon' : `nouvel essai dans ${delayMin} min`} (${err.message})`);
  }
}

export function startNotificationWorker() {
  const provider = whatsappProvider();
  if (!provider) {
    console.log('Notifications WhatsApp : désactivées (WHATSAPP_PROVIDER non configuré, voir GUIDE_NOUVELLES_FONCTIONNALITES.md).');
    return;
  }
  console.log(`Notifications WhatsApp : actives (${provider}).`);

  let running = false;
  let lastError = '';
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { data, error } = await supabaseAdmin.rpc('claim_notifications', { p_limit: 10 });
      if (error) {
        // Une seule fois dans les journaux (ex. new_features.sql pas encore exécuté).
        if (error.message !== lastError) console.error('Notifications WhatsApp :', error.message);
        lastError = error.message;
        return;
      }
      lastError = '';
      for (const notification of data || []) await deliver(notification);
    } catch (err) {
      console.error('Notifications WhatsApp :', err.message);
    } finally {
      running = false;
    }
  };

  setInterval(tick, POLL_MS).unref();
  tick();
}
