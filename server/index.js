import dotenv from 'dotenv';
import { initMonitoring, reportError, Sentry } from './lib/monitoring.js';

dotenv.config();
// La surveillance démarre avant le reste, pour capter aussi les erreurs de démarrage.
initMonitoring();

const { default: app } = await import('./app.js');
const { startNotificationWorker } = await import('./lib/notificationWorker.js');

const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (reason) => reportError(reason, 'Promesse rejetée non gérée'));
// Exception non rattrapée : l'état du serveur est incertain. On la signale, puis on s'arrête
// proprement ; l'hébergeur redémarre aussitôt le serveur.
process.on('uncaughtException', async (error) => {
  reportError(error, 'Exception non gérée');
  await Sentry.flush(2000).catch(() => {});
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  startNotificationWorker();
});
