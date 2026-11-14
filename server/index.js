import dotenv from 'dotenv';
import { initMonitoring, reportError, Sentry } from './lib/monitoring.js';

dotenv.config();
// La surveillance démarre avant le reste, pour capter aussi les erreurs de démarrage.
initMonitoring();

const { createApp, parseServices } = await import('./app.js');
const { startNotificationWorker } = await import('./lib/notificationWorker.js');

const PORT = process.env.PORT || 3000;
// SERVICE=commandes ou SERVICE=ia (un déploiement Northflank par service) ; sans valeur : tout ensemble.
const services = parseServices(process.env.SERVICE);
const app = createApp({ services });

process.on('unhandledRejection', (reason) => reportError(reason, 'Promesse rejetée non gérée'));
// Exception non rattrapée : l'état du serveur est incertain. On la signale, puis on s'arrête
// proprement ; l'hébergeur redémarre aussitôt le serveur.
process.on('uncaughtException', async (error) => {
  reportError(error, 'Exception non gérée');
  await Sentry.flush(2000).catch(() => {});
  process.exit(1);
});

let stopWorker = () => {};
const server = app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT} · services : ${services.join(', ')}`);
  // La file WhatsApp vit avec le service des commandes (sûre même à plusieurs copies : claim_notifications).
  if (services.includes('commandes')) stopWorker = startNotificationWorker() || stopWorker;
});

// Arrêt propre (redéploiement, canary, mise à l'échelle) : on n'accepte plus de nouvelles demandes,
// on laisse finir celles en cours (un paiement ne doit jamais être coupé), puis on s'arrête.
const SHUTDOWN_GRACE_MS = 15000;
let stopping = false;
const shutdown = (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} reçu : arrêt propre (demandes en cours terminées, ${SHUTDOWN_GRACE_MS / 1000} s au plus).`);
  stopWorker();
  const force = setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS);
  force.unref();
  server.close(async () => {
    await Sentry.flush(2000).catch(() => {});
    process.exit(0);
  });
  server.closeIdleConnections?.();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
