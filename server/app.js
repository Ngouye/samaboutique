import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payment.js';
import reviewRoutes from './routes/reviews.js';
import { Sentry, monitoringEnabled, reportError } from './lib/monitoring.js';

dotenv.config();

// Application Express, sans démarrage : index.js la lance, les tests l'utilisent directement.
const app = express();

// Derrière l'hébergeur (Render, Railway…) : adresse IP réelle du visiteur pour les limites ci-dessous.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

// Limites par adresse IP : protège contre les robots et l'envoi massif de demandes.
const tooMany = { success: false, error: 'Trop de demandes. Réessayez dans quelques minutes.' };
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany,
  // Les notifications de PayDunya ne doivent jamais être bloquées (elles sont vérifiées par signature).
  skip: (req) => req.path === '/api/payments/webhook' || req.path === '/health',
});
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany,
});

// Seul le site SamaBoutik peut appeler l'API depuis un navigateur.
// FRONTEND_URL accepte plusieurs adresses séparées par des virgules.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Middlewares
app.use(cors({
  // Les appels serveur à serveur (webhook PayDunya) n'ont pas d'en-tête Origin.
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
}));
// Après CORS : le message « trop de demandes » reste lisible par le site.
app.use(generalLimiter);
app.use('/api/payments/create', paymentLimiter);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // Notifications PayDunya (formulaire)

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Samaboutik Payment API is running' });
});

// Adresse inconnue
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Adresse inconnue' });
});

// Erreurs non prévues : signalées à Sentry, réponse générique (aucun détail technique renvoyé).
if (monitoringEnabled()) Sentry.setupExpressErrorHandler(app);
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: 'Requête invalide' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ success: false, error: 'Requête trop volumineuse' });
  if (!monitoringEnabled()) reportError(err, `${req.method} ${req.path}`);
  res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
});

export default app;
