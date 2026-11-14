# Image du serveur SamaBoutik : une seule image pour les deux microservices.
# Le rôle est choisi au déploiement par la variable SERVICE (« commandes » ou « ia ») ; sans valeur, tout tourne ensemble.
# Construction (dossier server/ comme contexte) : docker build -t samaboutik-api .
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dépendances d'abord : la couche est réutilisée tant que package*.json ne change pas.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Code du serveur (le .dockerignore écarte .env, node_modules et les fichiers inutiles).
COPY . .

# Jamais en administrateur.
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" > /dev/null || exit 1

# node directement (et non npm) : il reçoit SIGTERM et s'arrête proprement.
CMD ["node", "index.js"]
