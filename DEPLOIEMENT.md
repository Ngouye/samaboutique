# Déploiement gratuit : Vercel + Northflank + Supabase

Trois services gratuits :

| Rôle | Où | Pourquoi |
|---|---|---|
| Site (front) | **Vercel** | Réseau mondial, préversion par branche |
| Serveur, en 2 microservices | **Northflank** (offre « Sandbox ») | Gratuit, toujours allumé (jamais en veille) ; une carte est demandée pour vérifier le compte, rien n'est prélevé |
| Base de données, comptes | **Supabase** | Déjà en place |

```
Visiteurs ──► Vercel (site)
                 │ VITE_API_URL ─────────► api-commandes (SERVICE=commandes) ──► PayDunya, WhatsApp
                 │ VITE_AI_API_URL ──────► api-ia        (SERVICE=ia)        ──► IA, Photoroom
                 │                               │                │
                 └───────────────────────────────┴────────────────┴──► Supabase
```

**Une seule image Docker** (`server/Dockerfile`) pour les deux services. La variable `SERVICE` choisit le rôle :

- `commandes` : paiements PayDunya (création et confirmation), avis clients, file d'envoi WhatsApp ;
- `ia` : assistant IA (fiche produit, photo studio), séparé parce que ses requêtes sont lourdes et longues.

Sans `SERVICE`, tout tourne ensemble (développement local).

---

## Étape 0 · Avant de commencer

- [ ] Supabase → SQL Editor :
  - exécuter `stock_et_annuaire.sql`,
  - puis `paiements_et_ia.sql` (voir `A_FAIRE.md`).
- [ ] Noter la **région** de votre projet Supabase : Project Settings → General.
- [ ] Le code est sur GitHub, branche `main`.

---

## Étape 1 · Northflank (gratuit)

### 1.1 Compte et projet

1. Créer un compte sur northflank.com (connexion avec GitHub).
   - À la création du projet gratuit, Northflank demande une **carte Visa/Mastercard pour vérifier le compte** (lutte contre les abus).
   - Selon Northflank, la carte sert seulement à la vérification : rien n'est prélevé sur l'offre gratuite. Pays : Sénégal.
   - Sans carte, la solution de repli est Render (gratuit sans carte). Mais son serveur se met en veille après 15 minutes sans visite, et le premier paiement attend alors 30 à 60 s.
2. Créer un projet `samaboutik`.
   - **Cible de déploiement** : « Northflank Cloud ». Le navigateur peut le traduire en « Nuage du flanc nord ».
   - **Région** : la plus proche de Supabase. Pour SamaBoutik, la base est en **Irlande (`eu-west-1`)** : choisir **« Europe - Ouest » (Londres)**, à quelques millisecondes de Dublin.
   - ⚠️ **La région ne peut plus être changée ensuite.**
3. Autoriser Northflank à lire le dépôt GitHub `Ngouye/samaboutique`.

### 1.2 Service `api-commandes`

Créer un service qui construit et déploie à partir du dépôt (« combined service ») :

| Réglage | Valeur |
|---|---|
| Dépôt / branche | `Ngouye/samaboutique` · `main` |
| Méthode de construction | Dockerfile |
| Contexte de construction | `/server` |
| Chemin du Dockerfile | `/server/Dockerfile` |
| Port | `3000`, HTTP, **public** |
| Vérification de santé | HTTP, chemin `/health`, port `3000` (vérification de disponibilité « readiness » et de vie « liveness ») |
| Déploiement automatique | activé (chaque envoi sur `main` redéploie) |

Variables d'environnement (en secret) :

| Variable | Valeur |
|---|---|
| `SERVICE` | `commandes` |
| `SUPABASE_URL` | adresse du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` (secrète, jamais dans Vercel) |
| `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN` | vos clés PayDunya |
| `FRONTEND_URL` | adresse du site Vercel (plusieurs possibles, séparées par des virgules) |
| `BACKEND_URL` | adresse publique de **ce** service (voir ci-dessous) |
| `WHATSAPP_PROVIDER` + jetons | facultatif (notifications WhatsApp) |
| `SENTRY_DSN` | facultatif (surveillance des erreurs) |

> `BACKEND_URL` : déployez une première fois, copiez l'adresse publique du service (`https://…code.run`), ajoutez-la, puis redéployez. PayDunya s'en sert pour confirmer les paiements.

### 1.3 Service `api-ia`

Même dépôt, même construction (contexte `/server`, Dockerfile, port `3000` public, santé `/health`).

| Variable | Valeur |
|---|---|
| `SERVICE` | `ia` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | comme pour `api-commandes` |
| `ANTHROPIC_API_KEY` | clé de l'assistant (fiche produit) |
| `PHOTOROOM_API_KEY` | clé Photoroom (photo studio) |
| `FRONTEND_URL` | adresse du site Vercel |
| `SENTRY_DSN` | facultatif |

Sans les clés de l'assistant, le service démarre normalement et l'assistant reste simplement caché dans le tableau de bord.

### 1.4 Vérifier

- `https://<api-commandes>/health` → `{"status":"OK", … "services":["commandes"]}`
- `https://<api-ia>/health` → `{"status":"OK", … "services":["ia"]}`

### 1.5 Mises à jour sans coupure

- Chaque service ne reçoit du trafic qu'une fois `/health` au vert.
- À l'arrêt d'une ancienne version (signal `SIGTERM`), le serveur n'accepte plus de nouvelles demandes et laisse finir celles en cours (15 s au plus). Un paiement n'est jamais coupé.
- **Canary** : Northflank sait envoyer une partie du trafic vers la nouvelle version, puis la promouvoir ou revenir en arrière (progression manuelle). Si l'option est proposée dans votre offre, activez-la sur `api-commandes`.

---

## Étape 2 · Vercel

**Les adresses des deux services sont dans le fichier `.env.production` du dépôt** :

- `VITE_COMMANDES_API_URL` : adresse de `api-commandes` ;
- `VITE_AI_API_URL` : adresse de `api-ia`.

Elles ne sont pas secrètes : elles apparaissent de toute façon dans le code du site. Vercel reconstruit le site à chaque envoi sur `main` et les prend automatiquement. Elles passent avant une éventuelle ancienne `VITE_API_URL` réglée dans Vercel.

Si l'adresse d'un service change, modifiez `.env.production`, puis envoyez sur `main`.

Dans Vercel (Settings → Environment Variables), il ne reste que les variables de Supabase :

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | adresse du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | clé publique (`anon`) |

Puis, dans Northflank, mettre l'adresse Vercel (et votre domaine, s'il y en a un) dans `FRONTEND_URL` des deux services.

---

## Étape 3 · Vérification finale

- [ ] Commande **à la livraison** depuis un téléphone : elle apparaît dans le tableau de bord, le stock baisse.
- [ ] Petit paiement **Wave** : la commande passe en « En préparation » (confirmation PayDunya reçue par `api-commandes`).
- [ ] Assistant IA (si les clés sont réglées) : « Remplir la fiche avec l'IA » répond (`api-ia`).
- [ ] Journaux Northflank : aucune erreur au démarrage.

---

## Ce que l'offre gratuite ne fait pas (et comment évoluer)

L'offre gratuite Northflank inclut **2 services, 2 tâches et 1 module** (base de données ou Redis), toujours allumés. Elle n'inclut pas :

- plusieurs copies d'un même service,
- la répartition de charge entre copies,
- l'ajout automatique de copies (autoscaling).

Chaque service tourne donc en **une seule copie**. Pour passer à l'échelle (offre payante à l'usage) :

1. augmenter le nombre de copies de `api-commandes` (2 minimum) et activer l'autoscaling ;
2. ajouter un module **Redis** pour partager les limites anti-abus entre copies ;
3. la file WhatsApp n'envoie jamais deux fois le même message, même à plusieurs copies (`claim_notifications`).

## Retour arrière

- **Northflank** : redéployer la version précédente depuis l'historique du service (ou annuler le canary).
- **Vercel** : Deployments → version précédente → « Promote to Production ».

## Tester l'image en local (si Docker est installé)

```bash
docker build -t samaboutik-api server
docker run --rm -p 3000:3000 --env-file server/.env -e SERVICE=ia samaboutik-api
curl http://localhost:3000/health
```
