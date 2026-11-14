# Maîtriser Northflank pour SamaBoutik

Ce guide explique **tout ce qui a été mis en place** sur Northflank, **pourquoi**, et **comment le piloter** au quotidien.

- Pour l'installation pas à pas, voir `DEPLOIEMENT.md`.
- Ici, on cherche à comprendre.

---

## 1. Vue d'ensemble

### 1.1 Qui fait quoi

| Brique | Rôle | Où |
|---|---|---|
| **Site** (React) | Ce que voient clients, commerçants et livreurs | **Vercel**, `samaboutik-nine.vercel.app` |
| **`api-commandes`** | Paiements PayDunya (création + confirmation), avis clients, file d'envoi WhatsApp | **Northflank**, `https://p01--api-commandes--xcmy2qb5w6l7.code.run` |
| **`api-ia`** | Assistant IA (fiche produit, photo studio) | **Northflank**, `https://p01--api-ia--xcmy2qb5w6l7.code.run` |
| **Base de données, comptes, temps réel** | Commandes, produits, connexions | **Supabase** (Irlande, `eu-west-1`) |

```
Visiteurs ──► Vercel (site)
                 │
                 ├─ paiements, avis ──► api-commandes ──► PayDunya, WhatsApp
                 │                           │
                 ├─ assistant IA ─────► api-ia ─────────► IA, Photoroom
                 │                           │
                 └───────────────────────────┴──────────► Supabase
```

**À retenir**

- Le site lit et écrit directement dans Supabase pour presque tout (produits, commandes à la livraison, suivi).
- Il passe par Northflank **seulement** pour ce qui demande des clés secrètes : créer un paiement, recevoir la confirmation de PayDunya, appeler l'IA, envoyer des messages WhatsApp.

### 1.2 Pourquoi Northflank

- **Toujours allumé** : contrairement à l'offre gratuite de Render, le serveur ne s'endort jamais.
  - Sur Render, le premier client après 15 minutes de calme attendait plus de 20 secondes (mesuré : 21,8 s).
  - Pendant ce temps, PayDunya ne pouvait pas confirmer les paiements.
- **Gratuit** (offre « Sandbox »). Une carte bancaire est demandée **uniquement pour vérifier le compte**.
- **Kubernetes sous le capot**, sans avoir à le gérer : conteneurs, sondes de santé, mises à jour sans coupure.
  - Plus tard : plusieurs copies, canary, et même votre propre cluster (BYOC).

---

## 2. Le vocabulaire de Northflank

| Terme | Ce que c'est | Chez SamaBoutik |
|---|---|---|
| **Team / compte** | Votre espace Northflank | Compte personnel, offre **Free (Sandbox)** |
| **Project** | Un regroupement de services, **dans une région** | `Default`, région **Europe - West (Londres)** |
| **Region** | Le centre de données | Londres, le plus proche de Supabase (Irlande). ⚠️ **Ne se change plus** après création |
| **Combined service** (« Service combiné ») | **Construit** une image depuis GitHub **et la déploie**. Tout-en-un, avec mise à jour automatique (CI/CD) | `api-commandes` et `api-ia` |
| Build service / Deployment service | Les deux moitiés d'un service combiné, séparées | Pas utilisés |
| **Build** | Construction de l'image Docker à partir du `Dockerfile` | Un build à chaque envoi sur `main` |
| **Deployment** | Une version qui tourne (une image + des variables) | Un nouveau à chaque build réussi ou changement de variable |
| **Instance / pod / conteneur** | Une copie qui tourne du service | **1** par service (limite de l'offre gratuite) |
| **Runtime variables** | Variables lues par le serveur **pendant qu'il tourne** | Toutes nos clés sont ici |
| **Build arguments** | Variables utilisées **pendant la construction** | ⚠️ **Vides**, volontairement (voir 5.3) |
| **Health checks** (readiness, liveness) | Tests automatiques de `/health` | Réglés sur `api-commandes` |
| **Job** (« Emploi ») | Une tâche ponctuelle ou planifiée | Pas utilisé (2 disponibles en gratuit) |
| **Addon** (« Ajouter sur ») | Base de données, Redis… gérés par Northflank | Pas utilisé (1 disponible en gratuit, gardé pour Redis) |
| **BYOC** | Northflank pilote un cluster Kubernetes **dans votre propre cloud** | Pas utilisé (option d'avenir) |
| **CI / CD** (interrupteurs verts) | CI = reconstruire à chaque commit ; CD = déployer automatiquement le résultat | **Les deux activés** |

---

## 3. Comment une mise à jour arrive en ligne

```
git push origin main
      │
      ├──► Vercel : reconstruit le site (≈ 1 à 3 min)
      │
      └──► Northflank (pour chaque service) :
             1. BUILD : lit server/Dockerfile, construit l'image
             2. DEPLOY : démarre un nouveau conteneur avec la nouvelle image
             3. READINESS : attend que /health réponde
             4. BASCULE : envoie le trafic au nouveau conteneur
             5. ARRÊT de l'ancien : signal SIGTERM, il termine ses demandes en cours (15 s au plus)
```

- **Vous n'avez rien à faire** : un `git push` sur `main` met à jour le site **et** les deux serveurs.
- Un changement de **variable** dans Northflank crée aussi un nouveau déploiement. La raison affichée est « ENV update ».

---

## 4. Ce qui a été changé dans le code (et pourquoi)

### 4.1 Un seul code, deux microservices : la variable `SERVICE`

On n'a pas réécrit le serveur : on l'a **découpé par configuration**.

- **`server/app.js`** contient `createApp({ services })`, qui ne monte que les routes demandées :
  - `commandes` : `/api/payments/*` (création, webhook PayDunya), `/api/reviews/*`, limite anti-abus des paiements ;
  - `ia` : `/api/ai/*` (lecteur JSON de 8 Mo pour les photos).

  `/health` existe toujours et répond `{"status":"OK", "services":[...]}`.
- **`server/index.js`** lit `SERVICE` :
  - `SERVICE=commandes` ou `SERVICE=ia` : un seul rôle ;
  - pas de `SERVICE` (ou `tout`) : tout ensemble, pour le développement local ;
  - une valeur inconnue : **le serveur refuse de démarrer**, avec un message clair. C'est voulu, pour qu'une faute de frappe se voie tout de suite.
- **La file WhatsApp** ne démarre qu'avec `commandes`.
  - Elle est sûre même avec plusieurs copies : `claim_notifications()` réserve les messages avec `FOR UPDATE SKIP LOCKED`.
  - Un message ne part donc jamais deux fois.

**Vérification** : `tests/server/services.test.js` contrôle que chaque service n'expose que ses routes.

### 4.2 L'arrêt propre (« graceful shutdown »)

Quand Northflank remplace une version, il envoie **SIGTERM** à l'ancien conteneur. Le serveur, dans `server/index.js` :

1. arrête la file WhatsApp (plus de nouveaux envois) ;
2. **n'accepte plus de nouvelles demandes** ;
3. **laisse finir celles en cours** (un paiement en cours de création n'est pas coupé) ;
4. s'arrête, au plus tard au bout de **15 s**.

C'est ce qui permet des mises à jour **sans coupure**, même avec une seule copie.

### 4.3 Le `Dockerfile` ligne par ligne (`server/Dockerfile`)

| Ligne | Rôle |
|---|---|
| `FROM node:22-alpine` | Node 22 sur Alpine Linux : image légère (~50 Mo) |
| `ENV NODE_ENV=production` | Mode production (plus rapide, moins de messages) |
| `WORKDIR /app` | Dossier de travail dans le conteneur |
| `COPY package.json package-lock.json ./` puis `RUN npm ci --omit=dev` | Installe **d'abord** les dépendances. Docker garde cette étape en cache tant que `package*.json` ne change pas : les builds suivants sont plus rapides |
| `COPY . .` | Copie le code du serveur (le `.dockerignore` écarte `.env`, `node_modules`…) |
| `USER node` | Le serveur ne tourne **jamais en administrateur** (sécurité) |
| `EXPOSE 3000` | Le serveur écoute sur le port 3000 |
| `HEALTHCHECK … /health` | Test de santé pour Docker en local. Sur Northflank, ce sont ses propres sondes qui comptent (voir 6) |
| `CMD ["node", "index.js"]` | Lance **node directement**, et non `npm start`, pour qu'il reçoive bien le signal SIGTERM |

**`server/.dockerignore`** : `.env`, `.env.*`, `node_modules`, `.git` et les fichiers `.md` n'entrent jamais dans l'image. **Vos secrets ne sont donc jamais dans l'image.**

### 4.4 Le site sait où sont les serveurs : `.env.production` et `src/utils/apiUrls.js`

- **`.env.production`** (dans le dépôt) contient les deux adresses **publiques** :
  ```
  VITE_COMMANDES_API_URL=https://p01--api-commandes--xcmy2qb5w6l7.code.run
  VITE_AI_API_URL=https://p01--api-ia--xcmy2qb5w6l7.code.run
  ```
  Ce n'est pas secret : ces adresses apparaissent de toute façon dans le code envoyé aux navigateurs.
- **`src/utils/apiUrls.js`** applique cet ordre de priorité :
  1. les variables des microservices ;
  2. puis l'ancienne `VITE_API_URL` réglée dans Vercel (qui pointait vers Render) ;
  3. puis `localhost:3000` en local.
- **Pourquoi ce choix** : l'accès au tableau de bord Vercel était bloqué (double authentification perdue). Comme Vercel reconstruit le site à chaque envoi sur GitHub, mettre les adresses dans le dépôt a suffi à basculer le site **sans se connecter à Vercel**.
- **Si une adresse change**, modifiez `.env.production`, puis `git push`.

---

## 5. La configuration des services dans Northflank

> La liste exhaustive de **tous** les réglages, service par service, est en **section 11 (Fiche de configuration complète)**. Cette section-ci explique les principaux.

### 5.1 Réglages communs aux deux services

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Dépôt / branche | `Ngouye/samaboutique` · `main` | Source du code |
| Type de build | **Dockerfile** | Construction maîtrisée (pas de « buildpack » qui devine) |
| **Build context** | `/server` | Dossier envoyé à Docker : seulement le serveur |
| **Dockerfile location** | `/server/Dockerfile` | ⚠️ Chemin **depuis la racine du dépôt**, pas depuis le contexte. Mettre `/Dockerfile` ne marche pas |
| Port | `3000`, **HTTP**, **public** | Le serveur écoute sur 3000 ; « public » donne l'adresse `…code.run` en HTTPS |
| Ressources | `nf-compute-10` : 0,1 vCPU, 256 Mo, 1 Go | Plan gratuit. Suffisant au départ |
| CI / CD | activés | Mise à jour à chaque `git push` sur `main` |

À noter : les **builds** tournent sur une machine plus puissante, fournie par Northflank (`nf-compute-400-16`, affichée dans le résumé). Ce n'est pas celle du service.

### 5.2 Les variables (noms exacts, valeurs dans Northflank uniquement)

**`api-commandes`**

| Variable | Rôle |
|---|---|
| `SERVICE` | `commandes` |
| `SUPABASE_URL` | Adresse de la base |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé administrateur de la base (**secrète**) |
| `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN` | Clés PayDunya (**secrètes**). Actuellement des clés de **test** |
| `PAYDUNYA_API_URL` | Adresse **sandbox** de PayDunya = mode test. **À supprimer** pour passer en mode réel |
| `FRONTEND_URL` | `https://samaboutik-nine.vercel.app` : seul ce site peut appeler l'API depuis un navigateur (CORS) |
| `BACKEND_URL` | `https://p01--api-commandes--xcmy2qb5w6l7.code.run` : adresse donnée à PayDunya pour qu'il confirme les paiements |

**`api-ia`**

| Variable | Rôle |
|---|---|
| `SERVICE` | `ia` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Vérifier les comptes, compter les utilisations de l'IA |
| `FRONTEND_URL` | Comme ci-dessus |
| `ANTHROPIC_API_KEY`, `PHOTOROOM_API_KEY` | **Pas encore ajoutées**. Sans elles, l'assistant reste caché dans le tableau de bord |

Facultatifs, pour plus tard :

- `SENTRY_DSN` : surveillance des erreurs ;
- `WHATSAPP_PROVIDER` + jetons : notifications WhatsApp.

### 5.3 Trois règles d'or pour les variables

1. **Toujours dans « Runtime variables », jamais dans « Build arguments ».** Un argument de build peut rester gravé dans l'image Docker. Une variable d'exécution reste dans Northflank.
2. **Le mode « ENV »** permet de coller plusieurs lignes `NOM=valeur` d'un coup. Le mode « View » permet de vérifier.
3. ⚠️ **Désactivez la traduction automatique du navigateur** sur Northflank (« Afficher l'original », « Ne jamais traduire ce site »).
   - Elle a **renommé nos variables** (`SUPABASE_URL` est devenu « URL SUPABASE ») : le serveur plantait avec `supabaseUrl est requis`.
   - Elle a aussi affiché `/server` comme « /serveur ».

Modifier une variable redéploie le service automatiquement.

---

## 6. Les vérifications de santé (health checks)

Northflank appelle régulièrement `GET /health` sur le port 3000.

| | **Readiness** (prêt à servir ?) | **Liveness** (toujours vivant ?) |
|---|---|---|
| Si ça échoue | Le conteneur **ne reçoit pas de trafic** | Le conteneur est **redémarré** |
| Utilité | Pendant une mise à jour, le trafic ne bascule que quand la nouvelle version répond | Relance automatique si le serveur se bloque |
| Initial delay | 15 s | 45 s |
| Interval | 10 s | 15 s |
| Timeout | 3 s | 5 s |
| Max. failures | 3 | 3 |
| Success threshold | 1 | 1 |

- **Pourquoi des délais de démarrage généreux** : avec 0,1 vCPU, le serveur met environ 10 à 15 s à démarrer (mesuré dans les journaux). Un délai trop court ferait croire à une panne, et Northflank relancerait le serveur en boucle.
- **État actuel** :
  - `api-commandes` a sa **Readiness**. Ajoutez aussi la **Liveness** si ce n'est pas fait.
  - Faites de même sur `api-ia`.

---

## 7. Piloter au quotidien

### 7.1 Où regarder

Dans un service, menu de gauche :

| Menu | Usage |
|---|---|
| **Overview** | État (`Running`, `1 / 1`), adresse publique, dernier commit déployé, CI/CD |
| **Deployments** | Historique des versions, avec la raison (nouveau commit, « ENV update »…) |
| **Logs** | Journaux du serveur (`stdout`/`stderr`). **Le premier réflexe en cas de problème** |
| **Metrics** | CPU, mémoire, requêtes HTTP |
| **Health** | Sondes de santé et nombre de redémarrages |
| **Events** | Événements Kubernetes (démarrage, échec d'une sonde, redémarrage…) |
| **Shell** | Terminal **dans** le conteneur, pour diagnostiquer. Rien n'y est conservé |
| **Builds** | Constructions Docker et leurs journaux |
| **Environment** | Variables d'exécution |
| **Networking** | Ports et domaines |
| **Resources** | Plan de calcul (CPU, mémoire) |

Les boutons du haut :

- **Restart** : relancer ;
- **Scale** : nombre de copies (offre payante) ;
- **Pause** : arrêter sans supprimer ;
- **⋯** : plus d'options.

### 7.2 Vérifier en 10 secondes que tout va bien

Ouvrez dans le navigateur, ou avec `curl` :

```
https://p01--api-commandes--xcmy2qb5w6l7.code.run/health   → {"status":"OK", …, "services":["commandes"]}
https://p01--api-ia--xcmy2qb5w6l7.code.run/health          → {"status":"OK", …, "services":["ia"]}
```

### 7.3 Lire un journal de plantage

Le journal se lit **de bas en haut**, du plus ancien au plus récent :

1. `Récupération sécurisée des variables d'environnement` : Northflank injecte vos variables.
2. `Démarrage du point d'entrée du conteneur...` : `node index.js` démarre.
3. Les lignes `◇ env injecté (0) depuis .env` sont normales : il n'y a pas de fichier `.env` dans l'image (voulu), tout vient de Northflank.
4. Puis, soit `Serveur démarré sur le port 3000 · services : commandes`, soit une erreur suivie de `Processus terminé avec le code de sortie 1`.
5. « Redémarré 4 fois » : Kubernetes relance un conteneur qui plante. Tant que la cause n'est pas corrigée, il replantera.

### 7.4 Revenir en arrière (rollback)

- **Le plus simple** : dans **Deployments** (ou **Builds**), redéployez la version précédente qui fonctionnait.
- **Par Git** (plus propre) : `git revert <commit>`, puis `git push`. Northflank et Vercel reconstruisent la version corrigée.
- **Vercel** (si l'accès est retrouvé) : Deployments, version précédente, « Promote to Production ».

### 7.5 Accéder au service depuis votre ordinateur, sans passer par Internet

Northflank propose un outil en ligne de commande (bouton « Install CLI ») :

```bash
northflank forward service --projectId default --serviceId api-commandes
```

Le service devient accessible en local, de façon privée.

---

## 8. Les problèmes rencontrés (et leçons)

| Symptôme | Cause | Solution | Leçon |
|---|---|---|---|
| Northflank ne trouvait pas le Dockerfile | « Dockerfile location » réglé à `/Dockerfile` | `/server/Dockerfile` (chemin depuis la racine du dépôt) | Le chemin du Dockerfile ne dépend pas du « build context » |
| Le site ne pouvait pas encore être construit par Northflank | Le Dockerfile n'était que sur l'ordinateur | `git push` avant de créer le service | Northflank lit **GitHub**, pas votre disque |
| Carte bancaire demandée | Vérification anti-abus de l'offre gratuite | Carte saisie (rien n'est prélevé, selon Northflank) | La page de tarifs disait « No card needed » : toujours vérifier sur place |
| `503` + « Connection refused » | Le serveur plantait au démarrage | Lire les journaux | 503 « connection refused » = personne n'écoute derrière |
| `supabaseUrl est requis` + « Redémarré 4 fois » | La traduction du navigateur avait **renommé les variables** | Traduction coupée, variables recollées | Jamais de traduction automatique sur une console technique |
| Impossible de se connecter à Vercel | Double authentification perdue, sans codes de secours | Adresses mises dans `.env.production` | Garder ses codes de secours en lieu sûr ; contacter le support Vercel |

---

## 9. Sécurité

- **Les secrets sont uniquement dans Northflank** (Runtime variables), et dans `server/.env` sur votre ordinateur. Ils ne sont jamais :
  - dans Git ;
  - dans l'image Docker ;
  - dans Vercel.
- **Bandeau « Northflank security incident »** : il concerne les identifiants créés **avant le 30 octobre**. Votre compte est plus récent.
  - Bonne pratique malgré tout : **renouveler régulièrement** la clé `service_role` de Supabase et les clés PayDunya.
  - Mettre ensuite à jour la variable dans Northflank, qui redéploie seul.
- **CORS** : seul `FRONTEND_URL` peut appeler l'API depuis un navigateur. Vérifié : un site inconnu est refusé.
- **Webhook PayDunya** : chaque confirmation est vérifiée par une signature calculée avec la `PAYDUNYA_MASTER_KEY`.
- ⚠️ **Mode test PayDunya** : tant que les clés sont des clés de test, un « paiement » Wave/Orange Money n'est **pas réel**, mais la commande apparaît payée. **Vérifiez sur votre compte PayDunya avant de livrer** une commande payée en ligne. Ou passez en mode réel (section 10).

---

## 10. Faire évoluer

### 10.1 Passer PayDunya en mode réel

1. Faire valider le compte PayDunya en **production** (documents demandés par PayDunya).
2. Dans `api-commandes`, puis **Environment** :
   - mettre les 3 clés de **production** ;
   - **supprimer** la ligne `PAYDUNYA_API_URL` (sans elle, le serveur utilise PayDunya réel) ;
   - **Save**.
3. Faire un petit vrai paiement de test.

### 10.2 Activer l'assistant IA

Dans `api-ia`, puis **Environment** : ajouter `ANTHROPIC_API_KEY` et/ou `PHOTOROOM_API_KEY`, puis **Save**. L'assistant apparaît alors dans le tableau de bord des commerçants.

### 10.3 Monter en charge (offre payante à l'usage)

La plus petite copie toujours allumée coûte environ **12 $/mois** (0,5 vCPU, 1 Go).

- **Plusieurs copies** (« Scale ») de `api-commandes` : 2 au minimum pour la haute disponibilité.
- **Autoscaling** : selon le CPU, la mémoire ou les requêtes par seconde. Minimum et maximum de copies ; contrôle toutes les 15 s.
- **Répartition de charge** automatique entre les copies. Stratégies :
  - **least connection** (par défaut, idéal pour nous) ;
  - round robin ;
  - consistent hashing (sessions « collantes », inutiles ici : le serveur ne garde rien en mémoire entre deux demandes).
- ⚠️ **Avant de dupliquer** : ajouter un addon **Redis** pour partager les limites anti-abus. Aujourd'hui elles sont en mémoire : avec 3 copies, la limite serait 3 fois plus large.

### 10.4 Canary : mettre en ligne progressivement

**Le principe.**

- La nouvelle version démarre **à côté** de l'ancienne (la version « stable »). Elle ne reçoit qu'**une part du trafic**, par exemple 10 %.
- Si tout va bien, on augmente progressivement, puis on la **promeut** à 100 %.
- Au moindre problème, on **revient en arrière** : 100 % du trafic retourne à l'ancienne version.
- La progression est **manuelle** chez Northflank : elle n'avance jamais toute seule.

**Ce qui rend SamaBoutik compatible.**

- Serveur sans état : rien n'est gardé en mémoire entre deux demandes.
- Vérifications de santé : le trafic ne va à la nouvelle version que si `/health` répond.
- Arrêt propre de l'ancienne version (section 4.2).
- File WhatsApp sûre même avec deux versions en même temps : `claim_notifications` avec `FOR UPDATE SKIP LOCKED`, donc aucun message en double.

**Étape 1 : créer la stratégie (une seule fois, au niveau de l'équipe).**

1. **Configuration** de l'équipe, puis **Canary rollouts**, puis **Create strategy**.
2. **Nom** : `canary-10`.
3. **Type de stratégie** :
   - **Percentage** (recommandé) : fixe la part de trafic envoyée à la nouvelle version. Commencez avec **10 % canary / 90 % stable**.
   - **Header** : n'envoie à la nouvelle version **que** les requêtes qui portent un en-tête choisi. Exemple de la documentation : `x-variant: canary`. Utile pour tester soi-même avant les clients.
4. **Triggers** (ce qui lance un canary) : cochez **CD**. Chaque mise à jour automatique depuis `main` démarre alors en canary.
5. **Block deployment on active rollout** : **activez**. Tant qu'un canary est en cours, aucune autre version ne peut être déployée : il faut d'abord promouvoir ou revenir en arrière.
6. **Create canary rollout strategy**.

**Étape 2 : l'attacher à `api-commandes`.**

1. Ouvrez le service, puis **Resources** (sous Run).
2. Dépliez **Advanced resource options**.
3. Dans **Canary rollout strategy**, choisissez `canary-10`.
4. Cliquez sur **Update & restart**.

**Étape 3 : chaque mise en ligne (`git push` sur `main`).**

1. Northflank construit l'image et démarre la nouvelle version **à côté** de l'ancienne, avec 10 % du trafic.
2. La page **Deployments** du service montre la version stable, la version canary et la part de trafic de chacune.
3. **Observer 15 à 30 minutes** :
   - **Logs** de la nouvelle version : aucune erreur ;
   - **Metrics** : mémoire et processeur normaux ;
   - `/health` répond ;
   - une commande de test passe ;
   - aucune nouvelle erreur dans Sentry (si configuré).
4. Tout va bien : sur **Deployments**, passez le trafic à **50 %** et enregistrez. Le changement est immédiat, sans redéploiement. Observez encore un peu.
5. **Promote the canary** : 100 % du trafic va à la nouvelle version, et l'ancienne est supprimée.
6. **Problème** : **Roll back**. Tout le trafic retourne à l'ancienne version, et le canary s'arrête.

**Les règles à respecter dans le code** (deux versions tournent en même temps) :

- **Base de données compatible dans les deux sens.**
  - On **ajoute** des colonnes ou des tables, on n'en **supprime** ni n'en **renomme** jamais dans la même mise en ligne. C'est la méthode « expand / contract ».
  - Exemple : `paiements_et_ia.sql` ajoute `payment_channel`. Le serveur sait se passer de cette colonne si elle manque.
- **PayDunya peut confirmer un paiement auprès de l'une ou l'autre version.** Les deux doivent savoir traiter les confirmations.
- **Les limites anti-abus** sont en mémoire, par version : pendant un canary, elles sont un peu plus larges. Sans conséquence.

**Limites à connaître.**

- La documentation de Northflank **ne précise pas** si le canary est disponible sur l'offre gratuite.
- Un canary fait tourner **deux versions en même temps**, ce qui peut dépasser les limites de la Sandbox. Si l'option est grisée ou refusée, c'est qu'il faut l'offre payante.
- Avec la stratégie **Header**, ce sont les clients qui doivent envoyer l'en-tête. Le site ne le fait pas aujourd'hui. Pour tester soi-même, on peut :
  - utiliser `curl -H "x-variant: canary" …` ;
  - ou ajouter au site un « mode test » qui envoie cet en-tête.

### 10.5 Votre propre domaine

`api.samaboutik.sn` (par exemple) peut pointer vers `api-commandes` : **Networking**, puis domaines personnalisés, avec certificat HTTPS automatique (inclus dans l'offre gratuite).

Penser ensuite à mettre à jour :

- `.env.production` ;
- `BACKEND_URL`.

### 10.6 BYOC : votre propre cluster Kubernetes

Northflank peut créer et gérer un cluster **dans votre compte cloud**.

- Fournisseurs listés : GKE, EKS, AKS, Civo, Oracle…
- L'offre gratuite inclut **1 cluster BYOC** ; le fournisseur cloud facture ses machines.
- Vous gardez `kubectl` et l'interface de Northflank.

### 10.7 Ajouter un troisième microservice

1. Ajouter un nom dans `SERVICES` et ses routes dans `createApp()` (`server/app.js`).
2. Ajouter un test dans `tests/server/services.test.js`.
3. Créer un nouveau **Combined service** avec le même dépôt, le même Dockerfile et `SERVICE=<nouveau>`.

⚠️ L'offre gratuite est limitée à **2 services**.

---

## 11. Fiche de configuration complète (état au 14 novembre 2026)

Tous les réglages faits sur Northflank. Légende de la colonne **État** :

- ✅ vu sur une capture d'écran ou vérifié par un test ;
- ☑️ fait par vous, d'après vos messages ;
- ❓ à vérifier ;
- ➖ volontairement non utilisé.

Les **valeurs secrètes** n'apparaissent jamais ici : seulement les noms.

### 11.1 Compte et projet

| Réglage | Valeur | État |
|---|---|---|
| Type de compte | Compte personnel, offre **Free (Sandbox)** | ✅ |
| Identifiant de l'équipe (dans les adresses) | `ngouyes-team` | ✅ |
| Vérification du compte | Carte bancaire (vérification seulement), pays : Sénégal | ☑️ |
| Projet | `Default` (identifiant `default`) | ✅ |
| Environnement affiché | `ENV Default` | ✅ |
| Cible de déploiement | **Northflank Cloud** (et non « Bring your own cloud ») | ✅ |
| Région | **Europe - West (Londres)**. ⚠️ Définitive pour ce projet | ✅ |
| Fournisseur Git connecté | **GitHub**, compte `Ngouye` | ✅ |
| Dépôt utilisé | `Ngouye/samaboutique` | ✅ |

### 11.2 Service `api-commandes`

**Identité et source**

| Réglage | Valeur | État |
|---|---|---|
| Type de service | **Combined service** (« Déploiement du dépôt ») | ✅ |
| Nom / identifiant | `api-commandes` | ✅ |
| Dépôt / branche | `Ngouye/samaboutique` · `main` | ✅ |
| Flux de déploiement | « Always deploy the latest version of branch `main` » | ✅ |
| CI (build automatique à chaque commit) | Activé | ✅ |
| CD (déploiement automatique du build) | Activé | ✅ |

**Construction (build)**

| Réglage | Valeur | État |
|---|---|---|
| Méthode | **Dockerfile** | ✅ |
| Source du Dockerfile | **Repository** (« Dépôt ») : le fichier vient de GitHub | ✅ |
| Build context | `/server` | ✅ |
| Dockerfile location | `/server/Dockerfile` (vérifié : « Dockerfile loaded ») | ✅ |
| Build arguments | **Aucun** (volontaire : pas de secret dans l'image) | ✅ |
| Machine de build | `nf-compute-400-16` : 4 vCPU, 16 Go, 16 Go de stockage, fournie par Northflank pour la construction | ✅ |

**Exécution (deploy)**

| Réglage | Valeur | État |
|---|---|---|
| Plan de calcul | `nf-compute-10` : 0,1 vCPU, 256 Mo, 1 Go de stockage (gratuit) | ✅ |
| Nombre de copies (instances) | **1** (maximum de l'offre gratuite) | ✅ |
| Commande de démarrage | Celle du Dockerfile : `node index.js` (aucun « CMD override ») | ✅ |
| Fichiers secrets / points de montage Docker | Aucun | ✅ |

**Réseau**

| Réglage | Valeur | État |
|---|---|---|
| Port | `p01` → **3000**, protocole **HTTP**, **public** | ✅ |
| Adresse publique (HTTPS automatique) | `https://p01--api-commandes--xcmy2qb5w6l7.code.run` | ✅ |
| Domaine personnalisé | Aucun pour l'instant | ➖ |

**Variables d'exécution (Runtime variables) : 9**

| Variable | Valeur ou contenu | État |
|---|---|---|
| `SERVICE` | `commandes` | ✅ (le service répond `"services":["commandes"]`) |
| `SUPABASE_URL` | Adresse du projet Supabase | ✅ (le serveur démarre) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé administrateur Supabase (secrète) | ✅ |
| `PAYDUNYA_MASTER_KEY` | Clé PayDunya de **test** (secrète) | ✅ |
| `PAYDUNYA_PRIVATE_KEY` | Clé PayDunya de **test** (secrète) | ✅ |
| `PAYDUNYA_TOKEN` | Jeton PayDunya de **test** (secret) | ✅ |
| `PAYDUNYA_API_URL` | Adresse **sandbox** de PayDunya (mode test) | ✅ |
| `FRONTEND_URL` | `https://samaboutik-nine.vercel.app` | ✅ (CORS vérifié) |
| `BACKEND_URL` | `https://p01--api-commandes--xcmy2qb5w6l7.code.run` | ☑️ |

**Vérifications de santé (Health checks)**

| Réglage | Readiness | Liveness | État |
|---|---|---|---|
| Protocole / chemin / port | HTTP · `/health` · `3000 (p01)` | HTTP · `/health` · `3000 (p01)` | ✅ readiness · ☑️ liveness |
| Initial delay | 15 s | 45 s | ☑️ |
| Interval | 10 s | 15 s | ☑️ |
| Timeout | 3 s | 5 s | ☑️ |
| Max. failures | 3 | 3 | ☑️ |
| Success threshold | 1 | 1 | ☑️ |

Valeurs par défaut proposées par Northflank pour la readiness, avant modification : initial delay 5, interval 60, timeout 10, max. failures 3, success threshold 1.

### 11.3 Service `api-ia`

| Réglage | Valeur | État |
|---|---|---|
| Type / nom | Combined service · `api-ia` | ✅ |
| Dépôt / branche / flux | `Ngouye/samaboutique` · `main` · dernière version de `main` | ☑️ |
| CI / CD | Activés | ❓ |
| Build | Dockerfile · contexte `/server` · `/server/Dockerfile` · source Repository · aucun build argument | ☑️ |
| Plan de calcul / copies | `nf-compute-10` (0,1 vCPU, 256 Mo) · 1 | ❓ |
| Port | `p01` → **3000**, HTTP, public | ✅ (l'adresse répond) |
| Adresse publique | `https://p01--api-ia--xcmy2qb5w6l7.code.run` | ✅ |
| Variables d'exécution (4) | `SERVICE=ia`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL` | ✅ (répond `"services":["ia"]`, CORS vérifié) |
| Clés de l'assistant | `ANTHROPIC_API_KEY`, `PHOTOROOM_API_KEY` : **pas encore ajoutées** | ➖ |
| Health checks | Mêmes réglages que `api-commandes` (readiness + liveness) | ❓ |

### 11.4 Ce qui n'est pas utilisé (volontairement)

| Fonction Northflank | Pourquoi | Quand l'activer |
|---|---|---|
| Jobs (2 gratuits) | Aucune tâche planifiée nécessaire | Exemple : un rappel quotidien des commandes en attente |
| Addon (1 gratuit) | Inutile avec une seule copie par service | **Redis**, avant de passer à plusieurs copies (section 10.3) |
| Volumes | Le serveur ne stocke rien sur disque (tout est dans Supabase) | Jamais a priori |
| Autoscaling / plusieurs copies / répartition de charge | Non inclus dans l'offre gratuite | Offre payante (section 10.3) |
| Canary | Inutile avec une seule copie | Avec plusieurs copies (section 10.4) |
| Domaines personnalisés | Les adresses `code.run` suffisent | Section 10.5 |
| BYOC | Pas besoin de son propre cluster | Section 10.6 |

### 11.5 Réglages liés, hors de Northflank

| Où | Réglage | Valeur |
|---|---|---|
| Dépôt GitHub | `.env.production` | `VITE_COMMANDES_API_URL` et `VITE_AI_API_URL` = les deux adresses `code.run` |
| Dépôt GitHub | `server/Dockerfile`, `server/.dockerignore` | Image unique des deux services |
| Vercel | `VITE_API_URL` (ancienne) | Pointe encore vers Render. Inutilisée, car `.env.production` passe avant. À supprimer quand l'accès à Vercel sera retrouvé |
| Render | Ancien serveur `samaboutik-api.onrender.com` | Plus utilisé par le site. À supprimer après quelques jours sans problème |
| Supabase | Région du projet | `eu-west-1` (Irlande) |

### 11.6 Garder cette fiche à jour

1. Après **chaque** changement dans Northflank, mettez à jour la ligne correspondante et sa colonne « État ».
2. Pour vérifier un ❓, ouvrez le service, puis le menu concerné : **Health**, **Environment**, **Resources**, **Networking**.
3. Si le menu **⋯** d'un service propose un export JSON ou « template », vous pouvez y sauvegarder la configuration exacte. Ne collez jamais dans Git un export qui contiendrait des secrets.

### 11.7 Tout recréer à l'identique (si un projet devait être refait)

1. Nouveau projet : Northflank Cloud, **Europe - West (Londres)**, GitHub connecté.
2. Pour chaque service :
   1. Combined service ;
   2. dépôt `Ngouye/samaboutique`, branche `main` ;
   3. Dockerfile, contexte `/server`, chemin `/server/Dockerfile` ;
   4. port 3000 HTTP public ;
   5. variables (11.2 ou 11.3) en mode ENV, **traduction du navigateur coupée** ;
   6. **Create**.
3. Ajouter les health checks (11.2).
4. Après la création de `api-commandes` : ajouter `BACKEND_URL` = sa nouvelle adresse.
5. Mettre les nouvelles adresses dans `.env.production`, puis `git push`.
6. Tester les deux `/health`.

---

## 12. Aide-mémoire

| Je veux… | Je fais… |
|---|---|
| Mettre à jour le site et les serveurs | `git push origin main` |
| Vérifier que les serveurs vont bien | Ouvrir les deux adresses `/health` |
| Comprendre une panne | Service, puis **Logs** (lire de bas en haut) |
| Changer une clé | Service, **Environment**, mode ENV, modifier, **Save** |
| Relancer un service | Bouton **Restart** |
| Revenir à la version d'avant | **Deployments**, redéployer l'ancienne, ou `git revert` |
| Arrêter un service sans le supprimer | Bouton **Pause** |
| Ne pas déclencher de mise à jour automatique | Désactiver **CD** (ou **CI**) en haut du service |

## 13. Glossaire express

- **Image Docker** : le serveur « emballé » avec tout ce qu'il faut pour tourner.
- **Conteneur** : une image en train de tourner.
- **Pod** : l'unité Kubernetes qui fait tourner un conteneur (chez nous, 1 pod = 1 conteneur).
- **Readiness / liveness** : « prêt à servir ? » et « toujours vivant ? ».
- **SIGTERM** : signal envoyé pour demander à un programme de s'arrêter proprement.
- **CORS** : règle du navigateur qui limite quels sites peuvent appeler l'API.
- **CI/CD** : construction (CI) et déploiement (CD) automatiques à chaque commit.
- **Canary** : envoyer d'abord une petite part du trafic vers la nouvelle version.
- **Sandbox** : mode test (PayDunya), ou nom de l'offre gratuite (Northflank).
