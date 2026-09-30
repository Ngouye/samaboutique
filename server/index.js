import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payment.js';
import reviewRoutes from './routes/reviews.js';
import { startNotificationWorker } from './lib/notificationWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // Notifications PayDunya (formulaire)

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Samaboutik Payment API is running' });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  startNotificationWorker();
});
