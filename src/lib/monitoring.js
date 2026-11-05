// Surveillance des erreurs (Sentry). Inactive tant que VITE_SENTRY_DSN n'est pas défini.
// Le SDK n'est chargé qu'une fois la page affichée, pour ne pas la ralentir ;
// les erreurs survenues avant sont gardées en file d'attente puis envoyées.

const DSN = import.meta.env.VITE_SENTRY_DSN;
let sdk = null;
let userId;
const queue = [];

/* ------------------- Données personnelles : jamais envoyées ------------------- */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\+?\d[\d\s.-]{7,}\d/g;

export function scrubText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(EMAIL, '[email]').replace(PHONE, '[numéro]');
}

// Les paramètres d'adresse peuvent contenir un téléphone (?suivi=) ou un n° de commande (?orderId=).
export function scrubUrl(url) {
  if (typeof url !== 'string') return url;
  return url.split(/[?#]/)[0];
}

export function scrubBreadcrumb(breadcrumb) {
  if (!breadcrumb) return breadcrumb;
  // Les messages de la console peuvent contenir n'importe quelle donnée : on ne les garde pas.
  if (breadcrumb.category === 'console') return null;
  const out = { ...breadcrumb, message: scrubText(breadcrumb.message) };
  if (out.data) {
    const data = { ...out.data };
    for (const key of ['url', 'to', 'from']) if (data[key]) data[key] = scrubUrl(data[key]);
    delete data.body;
    out.data = data;
  }
  return out;
}

export function scrubEvent(event) {
  if (!event) return event;
  if (event.request) {
    event.request = { url: scrubUrl(event.request.url), method: event.request.method };
  }
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values || []) ex.value = scrubText(ex.value);
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb).filter(Boolean);
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  return event;
}

/* ------------------------------- API ------------------------------- */

const newReference = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 8).toUpperCase();

// Signale une erreur. Renvoie une courte référence (à communiquer au support), même si Sentry est inactif.
export function captureError(error, context = {}) {
  const reference = newReference();
  if (!DSN) return reference;
  const payload = { tags: { reference, ...(context.tags || {}) }, extra: context.extra };
  if (sdk) sdk.captureException(error, payload);
  else queue.push([error, payload]);
  return reference;
}

// Identifiant (pseudonyme) du marchand connecté, pour regrouper ses erreurs. Jamais son email.
export function setMonitoringUser(id) {
  userId = id || undefined;
  sdk?.setUser(userId ? { id: userId } : null);
}

const whenIdle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 2000));

export function initMonitoring() {
  if (!DSN || typeof window === 'undefined') return;

  const early = (event) => queue.push([event.error || event.reason || new Error(String(event.message || 'Erreur inconnue')), {}]);
  window.addEventListener('error', early);
  window.addEventListener('unhandledrejection', early);

  whenIdle(async () => {
    try {
      const Sentry = await import('./sentry');
      Sentry.init({
        dsn: DSN,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
        release: import.meta.env.VITE_APP_VERSION,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        beforeSend: (event) => (navigator.onLine === false ? null : scrubEvent(event)), // hors ligne : pas un bug
        beforeBreadcrumb: scrubBreadcrumb,
        ignoreErrors: ['ResizeObserver loop', 'Non-Error promise rejection captured', 'AbortError'],
        denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//],
      });
      sdk = Sentry;
      if (userId) Sentry.setUser({ id: userId });
      window.removeEventListener('error', early);
      window.removeEventListener('unhandledrejection', early);
      for (const [error, payload] of queue.splice(0)) Sentry.captureException(error, payload);
    } catch {
      // Sans réseau ou bloqué par un bloqueur de publicité : le site continue de fonctionner.
    }
  });
}
