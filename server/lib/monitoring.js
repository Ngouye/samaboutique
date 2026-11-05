import * as Sentry from '@sentry/node';

// Surveillance des erreurs du serveur (Sentry). Inactive tant que SENTRY_DSN n'est pas défini.
export const monitoringEnabled = () => Boolean(process.env.SENTRY_DSN);

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\+?\d[\d\s.-]{7,}\d/g;
export const scrubText = (text) => (typeof text === 'string' ? text.replace(EMAIL, '[email]').replace(PHONE, '[numéro]') : text);

// Rien de personnel ne quitte le serveur : ni corps de requête (coordonnées des clients),
// ni en-têtes (clés), ni paramètres d'adresse.
export function scrubEvent(event) {
  if (event.request) event.request = { method: event.request.method, url: String(event.request.url || '').split('?')[0] };
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values || []) ex.value = scrubText(ex.value);
  delete event.user;
  if (event.extra) event.extra = JSON.parse(scrubText(JSON.stringify(event.extra)));
  return event;
}

export function initMonitoring() {
  if (!monitoringEnabled()) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
}

// Journalise l'erreur et, si Sentry est configuré, la signale avec son contexte.
export function reportError(error, context = '', extra = {}) {
  console.error(context ? `${context} :` : 'Erreur :', error?.response?.data ?? error?.message ?? error);
  if (monitoringEnabled()) Sentry.captureException(error instanceof Error ? error : new Error(String(error?.message || error)), { tags: { context }, extra });
}

// Situation anormale sans exception (ex. montant payé incohérent).
export function reportWarning(message, extra = {}) {
  console.warn(message);
  if (monitoringEnabled()) Sentry.captureMessage(scrubText(message), { level: 'warning', extra });
}

export { Sentry };
