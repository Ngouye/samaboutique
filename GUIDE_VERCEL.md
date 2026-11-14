# Maîtriser Vercel pour SamaBoutik

Ce guide explique **comment le site est hébergé sur Vercel**, **ce qui a été configuré** et **comment le piloter**.

- Pour le serveur, voir `GUIDE_NORTHFLANK.md`.
- Pour l'installation complète, voir `DEPLOIEMENT.md`.

---

## 1. Vue d'ensemble

### 1.1 Le rôle de Vercel

Vercel héberge **le site** : l'application React construite par Vite. Ce sont tous les écrans :

- l'accueil ;
- les vitrines `/boutique/…` ;
- le tableau de bord commerçant `/dashboard` ;
- l'espace livreur `/livreur/…` ;
- l'administration `/admin`.

Vercel ne fait **aucun calcul** pour SamaBoutik. Il sert des **fichiers statiques** (HTML, JavaScript, CSS, images) depuis son réseau mondial de serveurs (CDN). Le navigateur du visiteur fait ensuite le reste :

- il parle **directement à Supabase** : produits, commandes à la livraison, connexion, suivi ;
- il parle **aux microservices Northflank** pour les paiements et l'assistant IA.

```
Visiteur ──► Vercel (fichiers du site, depuis le serveur le plus proche)
   │
   ├──► Supabase       (données, comptes, temps réel)
   ├──► api-commandes  (Northflank : paiements PayDunya, avis)
   └──► api-ia         (Northflank : assistant IA)
```

### 1.2 Pourquoi Vercel

- **Rapide partout** : les fichiers sont copiés sur des serveurs du monde entier. Exemple constaté : une page servie depuis Londres (`lhr1`).
- **Mise en ligne automatique** à chaque `git push` sur `main`.
- **HTTPS automatique**, et **retour arrière instantané** vers une ancienne version.
- Gratuit au départ (offre Hobby). ⚠️ Voir la section 9.1 sur l'usage commercial.

---

## 2. Le vocabulaire de Vercel

| Terme | Ce que c'est | Chez SamaBoutik |
|---|---|---|
| **Account / Team** | Votre espace Vercel | Compte personnel, offre **Hobby** (gratuite) |
| **Project** | Un site relié à un dépôt Git | Projet du site SamaBoutik |
| **Git integration** | Lien entre Vercel et GitHub | Dépôt `Ngouye/samaboutique` |
| **Production branch** | La branche qui alimente le site public | `main` |
| **Deployment** | Une version construite du site, figée et immuable | Une à chaque commit |
| **Production deployment** | Le déploiement servi sur l'adresse publique | Le dernier commit de `main` |
| **Preview deployment** | Un déploiement de test, sur une adresse à part, pour une autre branche ou une demande de fusion (PR) | Créés automatiquement pour les autres branches |
| **Framework preset** | Réglages de construction devinés par Vercel | **Vite** |
| **Build** | Construction du site : `npm install` puis `vite build` | Le résultat va dans `dist/` |
| **Environment variables** | Variables lues **pendant la construction** | Supabase (et l'ancienne `VITE_API_URL`) |
| **`vercel.json`** | Fichier de configuration dans le dépôt | En-têtes de sécurité, cache, réécriture |
| **Rewrite** | Règle « pour telle adresse, servir tel fichier » | Toutes les adresses servent `index.html` |
| **Edge Network / CDN** | Les serveurs de Vercel dans le monde | Sert les fichiers au plus près du visiteur |
| **Instant Rollback** | Revenir à un déploiement précédent en un clic | Section 7.3 |
| **Domain** | Adresse du site | `samaboutik-nine.vercel.app` |

---

## 3. Comment une mise à jour arrive en ligne

```
git push origin main
     │
     ▼
GitHub prévient Vercel (webhook)
     │
     ▼
Vercel construit le site :
  1. npm install                (dépendances de package.json)
  2. vite build                 (lit .env.production + les variables Vercel)
  3. dossier dist/              (index.html + assets/*.js, *.css + public/)
     │
     ▼
Copie sur le réseau mondial, puis bascule ATOMIQUE :
la nouvelle version remplace l'ancienne d'un coup, sans mélange
```

- Comptez **1 à 3 minutes**. C'est mesuré : après le commit `5aea347`, la nouvelle version était en ligne en moins de 30 secondes.
- **Aucune action manuelle** : pas besoin d'ouvrir le tableau de bord de Vercel.
- Le **même `git push`** met aussi à jour les serveurs Northflank (voir `GUIDE_NORTHFLANK.md`).

**Point clé : les variables `VITE_…` sont « gravées » pendant la construction.**

- Changer une variable dans Vercel **ne change rien** au site en ligne tant qu'on n'a pas **reconstruit** : bouton « Redeploy », ou nouveau `git push`.
- Tout ce qui commence par `VITE_` finit **dans le code envoyé aux navigateurs**. C'est donc **public**. **Jamais de secret** dans une variable `VITE_`.

---

## 4. Ce qui a été configuré (et pourquoi)

### 4.1 `vercel.json` : sécurité, cache, réécriture

**a) Les en-têtes de sécurité**, appliqués à toutes les pages (`"source": "/(.*)"`). Vérifié sur le site en ligne : ✅.

| En-tête | Valeur | Rôle |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Le navigateur n'utilise **que HTTPS** pendant 2 ans |
| `X-Content-Type-Options` | `nosniff` | Le navigateur ne « devine » pas le type d'un fichier (évite certaines attaques) |
| `X-Frame-Options` | `DENY` | Le site ne peut pas être affiché dans un cadre d'un autre site (anti-clickjacking) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Ne transmet pas les adresses complètes aux autres sites |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isole la fenêtre du site des fenêtres d'autres sites |
| `Permissions-Policy` | `camera=(), microphone=(), payment=(), usb=(), browsing-topics=(), geolocation=(self)` | Coupe l'accès à la caméra, au micro… ; **localisation autorisée pour le site lui-même** (position GPS du client et du livreur) |
| `Content-Security-Policy` | voir ci-dessous | Liste blanche de ce que la page a le droit de charger |

**La `Content-Security-Policy` (CSP), règle par règle :**

| Règle | Autorise | Pourquoi |
|---|---|---|
| `default-src 'self'` | Par défaut, uniquement le site lui-même | Base stricte |
| `script-src 'self' https://challenges.cloudflare.com` | Nos scripts + Cloudflare Turnstile (captcha) | Aucun script d'un autre site |
| `style-src 'self' 'unsafe-inline'` | Nos styles + styles en ligne | Nécessaire aux animations (framer-motion) |
| `font-src 'self' data:` | Nos polices | |
| `img-src 'self' data: blob: https:` | Images de partout en HTTPS | Photos des produits (Supabase Storage), cartes |
| `connect-src 'self' https://*.supabase.co wss://*.supabase.co https:` | Appels vers Supabase (HTTPS + temps réel) et **toute adresse HTTPS** | C'est ce qui autorise les appels vers **Northflank** (`…code.run`) |
| `frame-src https://www.openstreetmap.org https://challenges.cloudflare.com` | Cartes OpenStreetMap, captcha | |
| `worker-src 'self' blob:` | Tâches de fond du navigateur | |
| `media-src 'self' blob: https:` | Sons et vidéos | Médias éventuels (photos, vidéos de produits) |
| `object-src 'none'` | Aucun plugin (Flash…) | |
| `base-uri 'self'` / `form-action 'self'` | Formulaires et liens de base limités au site | |
| `frame-ancestors 'none'` | Personne ne peut afficher le site dans un cadre | Double du `X-Frame-Options` |
| `upgrade-insecure-requests` | Transforme `http://` en `https://` | |

**b) Le cache**

| Chemin | Règle | Effet |
|---|---|---|
| `/assets/(.*)` | `public, max-age=31536000, immutable` | Les fichiers JS/CSS sont gardés **1 an**. Leur nom change à chaque version (`index-AbC123.js`), donc pas de risque de vieille version |
| `/(images|logos|fonts)/(.*)` | `public, max-age=2592000, stale-while-revalidate=86400` | Images gardées 30 jours. C'est pour ça qu'on ajoute `?v=2` au nom quand une image change |
| Page HTML | Réglage par défaut de Vercel : `max-age=0, must-revalidate` | La page est toujours revérifiée : le visiteur reçoit vite la nouvelle version |

**c) La réécriture (rewrite)**

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

- Le site est une **application d'une seule page** : c'est React qui affiche `/dashboard`, `/boutique/chez-awa`, etc.
- Sans cette règle, ouvrir directement `/dashboard` donnerait une erreur 404.
- Les fichiers qui existent vraiment (`/assets/…`, `/images/…`) sont servis normalement.
- Vérifié : `/dashboard` et `/boutique/…` répondent `200` ✅.

### 4.2 `.env.production` : les adresses des serveurs

```
VITE_COMMANDES_API_URL=https://p01--api-commandes--xcmy2qb5w6l7.code.run
VITE_AI_API_URL=https://p01--api-ia--xcmy2qb5w6l7.code.run
```

- Vite lit ce fichier **pendant la construction en production**, donc sur Vercel.
- **`src/utils/apiUrls.js`** choisit l'adresse dans cet ordre :
  1. `VITE_COMMANDES_API_URL` ;
  2. puis l'ancienne `VITE_API_URL` réglée dans Vercel ;
  3. puis `http://localhost:3000` en local.
- **Pourquoi** : l'accès au tableau de bord Vercel était bloqué (double authentification perdue). Mettre les adresses dans le dépôt a permis de basculer le site de Render vers Northflank **sans se connecter à Vercel**.
- Vérifié : le site en ligne ne contient plus que les deux adresses Northflank, et plus Render ✅.

### 4.3 La construction (Vite)

| Élément | Valeur |
|---|---|
| Commande d'installation | `npm install` (par défaut) |
| Commande de construction | `npm run build`, soit `vite build` |
| Dossier produit | `dist/` |
| Découpage du code | `vite.config.js` regroupe React, Supabase, les animations et les icônes en fichiers séparés, mis en cache longtemps |
| Pages chargées à la demande | Chaque grande page (vitrine, tableau de bord…) est un fichier à part, chargé seulement quand on l'ouvre |

---

## 5. Les variables d'environnement

| Variable | Où | Valeur | Rôle |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Vercel | Adresse du projet Supabase | Connexion à la base (public par nature) |
| `VITE_SUPABASE_ANON_KEY` | Vercel | Clé **publique** (`anon`) de Supabase | Publique par nature : les règles de sécurité (RLS) de Supabase protègent les données |
| `VITE_API_URL` | Vercel | `https://samaboutik-api.onrender.com` (ancien serveur) | **Plus utilisée** (remplacée par `.env.production`). À supprimer quand l'accès sera retrouvé |
| `VITE_COMMANDES_API_URL` | `.env.production` (dépôt) | Adresse de `api-commandes` | Paiements, avis |
| `VITE_AI_API_URL` | `.env.production` (dépôt) | Adresse de `api-ia` | Assistant IA |
| `VITE_SENTRY_DSN` | — | Non réglée | Facultatif : surveillance des erreurs du site |
| `VITE_TURNSTILE_SITE_KEY` | — | Non réglée | Facultatif : captcha Cloudflare à la connexion et à l'inscription |

**Règles d'or**

1. **Jamais de clé secrète dans une variable `VITE_`.** Elles sont visibles par tout le monde. Interdit ici :
   - la clé `service_role` de Supabase ;
   - les clés PayDunya ;
   - les clés de l'IA.

   Ces clés vont uniquement sur Northflank.
2. Après un changement de variable dans Vercel : **Redeploy**, sinon rien ne change.
3. Dans Vercel, une variable peut viser **Production**, **Preview** et/ou **Development**. Cochez au moins Production.

---

## 6. Les domaines

| Domaine | Rôle |
|---|---|
| `samaboutik-nine.vercel.app` | Adresse publique actuelle (production), HTTPS automatique |
| Adresses de prévisualisation | Une adresse par déploiement et par branche, du type `…-<équipe>.vercel.app`, visible dans le tableau de bord |

**Ajouter votre propre domaine** (par exemple `samaboutik.sn`) :

1. Dans Vercel : **Settings → Domains → Add**.
2. Ajoutez l'enregistrement DNS demandé chez votre registraire.
3. Le certificat HTTPS est créé automatiquement.
4. Ensuite, sur Northflank, ajoutez le nouveau domaine dans `FRONTEND_URL`, sinon CORS bloquera les appels :
   ```
   FRONTEND_URL=https://samaboutik.sn,https://samaboutik-nine.vercel.app
   ```

---

## 7. Piloter au quotidien

### 7.1 Les menus du tableau de bord (quand l'accès est retrouvé)

| Menu | Usage |
|---|---|
| **Deployments** | Toutes les versions, leur commit, leur état (Ready, Error, Building) |
| Un déploiement → **Build Logs** | Journal de construction. **Premier réflexe si la mise en ligne échoue** |
| Un déploiement → **Runtime Logs** | Peu utile ici : le site est statique |
| **Settings → Environment Variables** | Variables `VITE_…` |
| **Settings → Domains** | Adresses du site |
| **Settings → Git** | Dépôt relié, branche de production |
| **Settings → General → Build & Development** | Framework (Vite), commandes, dossier `dist`, version de Node |

### 7.2 Vérifier sans le tableau de bord

Même sans accès à Vercel, on peut tout contrôler depuis l'extérieur :

```bash
# Le site répond, et les en-têtes de sécurité sont là
curl -sI https://samaboutik-nine.vercel.app/

# Une page profonde fonctionne (réécriture)
curl -s -o /dev/null -w "%{http_code}\n" https://samaboutik-nine.vercel.app/dashboard
```

Pour savoir quelle version est en ligne :

1. Ouvrez le site, puis faites **Ctrl+U** (code source).
2. Le nom du fichier `assets/index-XXXX.js` change à chaque version.

### 7.3 Revenir en arrière

- **Avec le tableau de bord** : Deployments, l'ancienne version qui fonctionnait, puis **⋯ → Promote to Production** (ou « Instant Rollback »). C'est immédiat, sans reconstruction.
- **Sans le tableau de bord** : `git revert <commit>` puis `git push`. Vercel reconstruit la version corrigée.

### 7.4 Forcer une reconstruction

- **Redeploy** depuis le tableau de bord ;
- ou un commit (même petit), puis `git push`.

---

## 8. Les problèmes rencontrés (et leçons)

| Symptôme | Cause | Solution | Leçon |
|---|---|---|---|
| Impossible de se connecter à Vercel (« Enter a Recovery Code ») | Double authentification activée, application d'authentification effacée, fichier `vercel-recovery-codes` introuvable | Adresses des serveurs mises dans `.env.production`, sans passer par le tableau de bord. Récupération du compte à demander au support | Garder les codes de secours **hors de l'ordinateur** (papier, gestionnaire de mots de passe) |
| Le site envoyait les paiements à l'ancien serveur Render (21,8 s de réveil) | `VITE_API_URL` réglée dans Vercel vers Render | `.env.production` avec des variables prioritaires (`VITE_COMMANDES_API_URL`, `VITE_AI_API_URL`) | Les variables du dépôt et celles de Vercel s'additionnent : choisir des noms clairs et un ordre de priorité |
| Une image modifiée restait l'ancienne chez certains visiteurs | Cache de 30 jours sur `/images` | `?v=2` ajouté au nom de l'image | Changer le nom (ou la version) d'un fichier mis en cache longtemps |

---

## 9. Sécurité et conditions

### 9.1 ⚠️ Usage commercial et offre gratuite

- Selon les conditions de Vercel, l'offre **Hobby (gratuite)** est prévue pour les projets **personnels et non commerciaux**.
- Une plateforme qui encaisse des ventes relève normalement de l'offre **Pro** (environ 20 $ par mois et par membre).
- **À vérifier sur vercel.com/pricing** et à prévoir avant le lancement commercial.
- Alternatives gratuites qui acceptent l'usage commercial, à vérifier au moment du choix : Cloudflare Pages, Netlify.
  - Le site étant statique, la migration est simple : construire avec `npm run build`, publier `dist/`.
  - Il faudra recopier les en-têtes de `vercel.json` dans le format de l'hébergeur choisi.

### 9.2 Bonnes pratiques

- **Double authentification** sur Vercel **et** codes de secours conservés en lieu sûr.
- Aucun secret dans les variables `VITE_` (section 5).
- Les en-têtes de sécurité vivent **dans le dépôt** (`vercel.json`) : ils sont versionnés, relus et appliqués à chaque déploiement.
- La clé `anon` de Supabase est publique **par conception**. La vraie protection, ce sont les règles RLS de la base (voir `GUIDE_SECURITE.md`).

### 9.3 Récupérer l'accès au compte (2FA perdue)

1. Sur la page de connexion, **« Use another method »** : essayez toutes les méthodes proposées (application, clé d'accès, e-mail).
2. Sinon, contactez le support depuis **vercel.com/help** (sujet : lost two-factor authentication / account recovery). Prouvez que le compte est à vous, par exemple avec l'adresse e-mail du compte et l'accès au GitHub relié.
3. Une fois connecté :
   - réactivez la 2FA ;
   - **téléchargez les nouveaux codes de secours** et rangez-les hors de l'ordinateur ;
   - supprimez la variable `VITE_API_URL` (ancienne, vers Render).

---

## 10. Fiche de configuration complète (état au 14 novembre 2026)

Légende de la colonne **État** :

- ✅ vérifié depuis le site en ligne ou le dépôt ;
- ☑️ d'après vos informations ;
- ❓ à vérifier dans le tableau de bord (accès bloqué pour l'instant) ;
- ➖ non utilisé.

### 10.1 Compte et projet

| Réglage | Valeur | État |
|---|---|---|
| Offre | **Hobby** (gratuite). ⚠️ Voir 9.1 | ☑️ |
| Accès au tableau de bord | **Bloqué** : 2FA perdue, récupération à demander (9.3) | ☑️ |
| Adresse de production | `https://samaboutik-nine.vercel.app` | ✅ |
| Domaine personnalisé | Aucun connu | ❓ |

### 10.2 Git et déploiement

| Réglage | Valeur | État |
|---|---|---|
| Dépôt relié | `Ngouye/samaboutique` (GitHub) | ✅ (chaque push sur `main` est mis en ligne) |
| Branche de production | `main` | ✅ |
| Déploiement automatique | Activé à chaque commit | ✅ (constaté après `5aea347`) |
| Prévisualisations des autres branches | Comportement par défaut de Vercel | ❓ |

### 10.3 Construction

| Réglage | Valeur | État |
|---|---|---|
| Framework preset | Vite | ❓ (déduit : le site construit est bien un site Vite) |
| Commande d'installation | `npm install` (par défaut) | ❓ |
| Commande de construction | `npm run build` (`vite build`) | ✅ (dans `package.json`) |
| Dossier produit | `dist` | ✅ (par défaut de Vite) |
| Version de Node | Valeur par défaut de Vercel | ❓ |
| Fichier `vercel.json` | En-têtes, cache, réécriture (section 4.1) | ✅ (appliqués en ligne) |
| Fichier `.env.production` | Adresses des deux microservices | ✅ |

### 10.4 Variables d'environnement (dans Vercel)

| Variable | Valeur | État |
|---|---|---|
| `VITE_SUPABASE_URL` | Adresse du projet Supabase | ✅ (présente dans le site construit) |
| `VITE_SUPABASE_ANON_KEY` | Clé publique `anon` | ✅ (présente dans le site construit) |
| `VITE_API_URL` | `https://samaboutik-api.onrender.com` | ✅ (vue avant le changement). Inutilisée, à supprimer |
| `VITE_SENTRY_DSN` | Non réglée | ✅ (absente du site construit) ➖ |
| `VITE_TURNSTILE_SITE_KEY` | Non réglée | ✅ (absente du site construit) ➖ |

### 10.5 Ce que le site en ligne applique (vérifié de l'extérieur)

| Élément | Valeur constatée | État |
|---|---|---|
| Serveur | `Server: Vercel`, cache CDN (`X-Vercel-Cache: HIT`), servi depuis Londres (`lhr1`) | ✅ |
| 7 en-têtes de sécurité | Tous présents (HSTS, nosniff, DENY, Referrer, COOP, Permissions, CSP) | ✅ |
| Cache `/assets` | `public, max-age=31536000, immutable` | ✅ |
| Cache de la page | `public, max-age=0, must-revalidate` | ✅ |
| Réécriture | `/dashboard`, `/boutique/…` → `200` | ✅ |
| Serveurs appelés | `api-commandes` et `api-ia` (Northflank) ; plus aucun appel à Render | ✅ |

### 10.6 Ce qui n'est pas utilisé

| Fonction | Pourquoi | Quand l'activer |
|---|---|---|
| Vercel Functions (serveur chez Vercel) | Le serveur est sur Northflank | Jamais a priori |
| Vercel Analytics / Speed Insights | Pas encore nécessaire | Pour mesurer les visites et la vitesse réelle |
| Domaine personnalisé | Adresse `vercel.app` suffisante | Avant le lancement commercial |
| Protection des prévisualisations | Offre gratuite | Si des préversions doivent rester privées |

### 10.7 Tout recréer à l'identique

1. Nouveau projet Vercel : **Import Git Repository**, `Ngouye/samaboutique`.
2. Framework : **Vite**, construction `npm run build`, dossier `dist`.
3. Variables : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, en Production et Preview.
4. **Deploy**.

Les en-têtes (`vercel.json`) et les adresses des serveurs (`.env.production`) viennent automatiquement du dépôt.

Ensuite :

5. Si l'adresse du site change, mettez-la dans `FRONTEND_URL` des deux services Northflank.
6. Vérifiez avec les commandes de la section 7.2.

---

## 11. Aide-mémoire

| Je veux… | Je fais… |
|---|---|
| Mettre le site à jour | `git push origin main` |
| Savoir si la mise en ligne a marché | Deployments → état « Ready » ; sinon ouvrir le site et regarder `assets/index-XXXX.js` (Ctrl+U) |
| Comprendre un échec de mise en ligne | Deployments → le déploiement en erreur → **Build Logs** |
| Changer une adresse de serveur | Modifier `.env.production`, puis `git push` |
| Changer une variable Vercel | Settings → Environment Variables, puis **Redeploy** |
| Revenir à la version d'avant | Promote to Production sur l'ancien déploiement, ou `git revert` puis `git push` |
| Vérifier la sécurité | `curl -sI https://samaboutik-nine.vercel.app/` : les 7 en-têtes doivent apparaître |

## 12. Glossaire express

- **Site statique** : des fichiers servis tels quels ; tout le calcul se fait dans le navigateur.
- **CDN** : réseau de serveurs dans le monde qui garde une copie du site, près des visiteurs.
- **Build** : transformation du code source en fichiers optimisés (`dist/`).
- **Variable `VITE_`** : réglage intégré au site **au moment de la construction**. Elle est publique.
- **Rewrite** : servir un fichier à la place d'un autre (ici, `index.html` pour toutes les pages).
- **HSTS** : oblige le navigateur à n'utiliser que HTTPS.
- **CSP** : liste de ce que la page a le droit de charger ou d'appeler.
- **Preview deployment** : copie de test du site pour une branche, sur une adresse à part.
- **Rollback** : revenir à une version précédente.
- **2FA** : double authentification (mot de passe + code temporaire).
