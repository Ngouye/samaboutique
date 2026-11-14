// Adresses des microservices du serveur (Northflank). Elles ne sont pas secrètes : elles finissent de toute façon
// dans le code envoyé aux visiteurs. En production, elles viennent du fichier .env.production du dépôt.
//  - commandes : paiements PayDunya, avis ;
//  - ia        : assistant IA (fiche produit, photo studio).
// Ordre de priorité : variables propres aux microservices, puis l'ancienne VITE_API_URL, puis le serveur local.
export const COMMANDES_API = import.meta.env.VITE_COMMANDES_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const IA_API = import.meta.env.VITE_AI_API_URL || COMMANDES_API;
