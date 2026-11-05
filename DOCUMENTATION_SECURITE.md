# Documentation sécurité de SamaBoutik

> **Objet** : ce document recense toutes les protections intégrées au projet SamaBoutik. Pour chaque problème trouvé, il indique le risque, la correction, son fonctionnement et les fichiers concernés.
>
> **État au** : 4 octobre 2026
> **Pour qui** : le propriétaire de la plateforme et tout développeur qui reprendra le projet.
> **Guide de mise en ligne** : la marche à suivre pas à pas se trouve dans [`GUIDE_SECURITE.md`](GUIDE_SECURITE.md).

---

## Sommaire

1. [Principes de sécurité retenus](#1-principes-de-sécurité-retenus)
2. [Architecture et points de contrôle](#2-architecture-et-points-de-contrôle)
3. [Tableau récapitulatif des corrections](#3-tableau-récapitulatif-des-corrections)
4. [Détail des protections](#4-détail-des-protections)
   - 4.1 [Secrets et clés d'accès](#41-secrets-et-clés-daccès)
   - 4.2 [Commandes et paiements](#42-commandes-et-paiements)
   - 4.3 [Abonnements des marchands](#43-abonnements-des-marchands)
   - 4.4 [Contrôle d'accès à la base de données](#44-contrôle-daccès-à-la-base-de-données)
   - 4.5 [Espace livreur](#45-espace-livreur)
   - 4.6 [Parcours client : commande, suivi, reçu, avis](#46-parcours-client--commande-suivi-reçu-avis)
   - 4.7 [Administration de la plateforme](#47-administration-de-la-plateforme)
   - 4.8 [Lutte contre les abus et les robots](#48-lutte-contre-les-abus-et-les-robots)
   - 4.9 [Protection dans le navigateur (Vercel)](#49-protection-dans-le-navigateur-vercel)
   - 4.10 [Serveur de paiement (Express)](#410-serveur-de-paiement-express)
   - 4.11 [Comptes et mots de passe](#411-comptes-et-mots-de-passe)
   - 4.12 [Données personnelles et fonctionnalités récentes](#412-données-personnelles-et-fonctionnalités-récentes)
   - 4.13 [Code de l'application web](#413-code-de-lapplication-web)
5. [Comment tout cela a été vérifié](#5-comment-tout-cela-a-été-vérifié)
6. [Ordre d'installation des scripts SQL](#6-ordre-dinstallation-des-scripts-sql)
7. [Limites connues et actions restantes](#7-limites-connues-et-actions-restantes)
8. [Annexe : fichiers liés à la sécurité](#8-annexe--fichiers-liés-à-la-sécurité)

---

## 1. Principes de sécurité retenus

Toutes les corrections suivent cinq règles simples.

| Principe | Ce que cela veut dire concrètement |
|---|---|
| **Ne jamais faire confiance au navigateur** | Tout ce qui vient du téléphone ou de l'ordinateur d'un visiteur peut être modifié (prix, statut, identité). Les montants, statuts et droits sont donc recalculés ou vérifiés côté serveur ou base de données. |
| **La base de données est la dernière barrière** | Même si le site avait un bug, les règles de la base (RLS, droits par colonne, fonctions contrôlées) empêchent de lire ou de modifier ce qui ne doit pas l'être. |
| **Les secrets restent sur le serveur** | Les clés PayDunya, WhatsApp et la clé `service_role` de Supabase ne sont jamais envoyées au navigateur ni enregistrées dans Git. |
| **Limiter, pas seulement interdire** | Les actions sensibles (connexion, code PIN, commande, avis, paiement) sont limitées en nombre d'essais pour bloquer les attaques par force brute et les robots. |
| **Défense en profondeur** | Plusieurs protections se superposent : navigateur (en-têtes), serveur (limites, vérifications), base de données (règles d'accès). Si l'une cède, les autres tiennent. |

---

## 2. Architecture et points de contrôle

```
                ┌──────────────────────────────────────────────────────┐
  Visiteur ───▶ │  Site web (Vercel)                                   │
  Marchand      │  • En-têtes de sécurité, CSP, HTTPS obligatoire      │
  Livreur       │  • Captcha Turnstile (inscription / connexion)       │
  Admin         └───────────────┬───────────────────────┬──────────────┘
                                │ clé publique (anon)    │ appels API
                                ▼                        ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────────────┐
   │ Supabase (base PostgreSQL + Auth)   │   │ Serveur de paiement (Express)     │
   │ • RLS sur chaque table              │◀──│ • Helmet, CORS limité, limites    │
   │ • Droits par colonne                │   │ • Recalcul des montants           │
   │ • Fonctions contrôlées (RPC)        │   │ • Clé service_role (secrète)      │
   │ • Limites d'essais en base          │   │ • Envoi WhatsApp (file d'attente) │
   │ • Double authentification admin     │   └──────────────┬───────────────────┘
   └───────────────▲────────────────────┘                  │
                   │                         notification signée (IPN)
   ┌───────────────┴────────────────────┐   ┌──────────────▼───────────────────┐
   │ Fonctions Edge Supabase             │◀──│ PayDunya (Wave, Orange Money,     │
   │ • paydunya-checkout (abonnements)   │   │ carte)                            │
   │ • paydunya-webhook (vérification)   │   └───────────────────────────────────┘
   └─────────────────────────────────────┘
```

Il y a trois niveaux de contrôle :
1. **Le navigateur** n'a que la clé publique de Supabase. Elle ne permet que ce que les règles de la base autorisent.
2. **Le serveur et les fonctions Edge** détiennent les secrets et vérifient chaque paiement auprès de PayDunya.
3. **La base de données** applique les règles finales, quel que soit l'appelant.

---

## 3. Tableau récapitulatif des corrections

Gravité : 🔴 critique · 🟠 élevée · 🟡 moyenne

| # | Problème trouvé | Gravité | Correction | Fichier(s) |
|---|---|---|---|---|
| 1 | Clé `service_role` (accès total à la base) écrite dans des scripts et des fichiers `.env` suivis par Git | 🔴 | Scripts passés en variables d'environnement, `.env` retirés de Git et ignorés | `create_admin.js`, `create_bucket.js`, `create_test_shop.js`, `.gitignore` |
| 2 | Le prix d'une commande venait du navigateur (commande à 1 F possible) | 🔴 | Total recalculé en base et sur le serveur à partir des vrais prix | `security_fixes.sql`, `server/routes/payment.js` |
| 3 | Notification de paiement PayDunya acceptée sans vérification (faux paiement possible) | 🔴 | Signature vérifiée, paiement reconfirmé auprès de PayDunya, montant comparé | `server/routes/payment.js`, `supabase/functions/paydunya-webhook` |
| 4 | Un marchand pouvait s'activer un forfait Pro ou Premium sans payer | 🔴 | Colonnes d'abonnement verrouillées ; activation uniquement après paiement confirmé | `security_fixes.sql`, `MerchantDashboard.jsx`, fonctions Edge |
| 5 | Reversement au marchand déclenchable plusieurs fois par la même notification | 🟠 | Passage « en attente → payé » unique (idempotence) | `server/routes/payment.js` |
| 6 | Toutes les commandes (nom, téléphone, adresse, code) lisibles par n'importe qui | 🔴 | Lecture publique supprimée ; accès via fonctions contrôlées | `security_fixes_2.sql` |
| 7 | Connexion livreur basée sur un simple nom envoyé par le navigateur | 🔴 | Sessions à jeton secret (12 h), vérifiées par la base | `security_fixes_2.sql`, `DriverDashboard.jsx` |
| 8 | Code PIN de livraison et connexion livreur devinables par essais répétés | 🟠 | Limites d'essais (5 / 15 min) et blocage définitif après 10 erreurs | `security_fixes_2.sql` |
| 9 | Deux livreurs pouvaient prendre la même course | 🟡 | Verrou de ligne au moment de l'acceptation | `security_fixes_2.sql` |
| 10 | Avis clients publiables sans contrôle (spam, faux avis) | 🟠 | Fonction `submit_review` : validation, limites, badge « achat vérifié » | `security_fixes_2.sql`, `server/routes/reviews.js` |
| 11 | Rôle administrateur décidé par une adresse email écrite dans le code du site | 🟠 | Rôle stocké en base (`platform_admins`) | `security_fixes_2.sql`, `AuthContext.jsx` |
| 12 | Un marchand pouvait envoyer des images dans le dossier d'un autre | 🟡 | Chaque marchand écrit uniquement dans son dossier | `security_fixes_2.sql` |
| 13 | Fiches marchands entièrement publiques (numéros de reversement Wave/OM, abonnements) | 🔴 | Droits par colonne : seules les infos de vitrine restent publiques | `security_fixes_3.sql`, `PublicShop.jsx`, `AuthContext.jsx` |
| 14 | Identifiant de commande visible dans les avis → accès au reçu complet du client | 🟠 | Identifiant masqué ; reçu limité aux paiements en ligne de moins de 2 h | `security_fixes_3.sql`, `server/routes/reviews.js` |
| 15 | Tables sensibles accessibles directement aux visiteurs anonymes | 🟠 | Accès anonyme retiré (commandes, livreurs, positions…) | `security_fixes_3.sql` |
| 16 | Admin protégé par un seul mot de passe | 🟠 | Double authentification obligatoire (code à 6 chiffres) | `security_fixes_3.sql`, `AdminMfaGate.jsx` |
| 17 | Aucun en-tête de sécurité : site affichable dans un faux site, pas de CSP | 🟠 | En-têtes HSTS, CSP, anti-iframe… | `vercel.json` |
| 18 | Serveur de paiement sans limite de demandes (robots, fausses factures) | 🟠 | Helmet + limites par adresse IP | `server/index.js` |
| 19 | Inscriptions automatisées par des robots | 🟡 | Captcha Cloudflare Turnstile (prêt à activer) | `Turnstile.jsx`, `Login.jsx`, `Register.jsx` |
| 20 | Mots de passe trop courts (6 caractères) | 🟡 | 8 caractères minimum + indicateur de robustesse | `Register.jsx`, `ResetPassword.jsx`, `AuthUI.jsx` |
| 21 | Ancienne route d'avis insérant des données avec la clé `service_role` sans aucun contrôle | 🟠 | Route supprimée | `server/routes/reviews.js` |
| 22 | API appelable depuis n'importe quel site | 🟡 | CORS limité aux adresses de SamaBoutik | `server/index.js` |

---

## 4. Détail des protections

### 4.1 Secrets et clés d'accès

**Risque.** La clé `service_role` de Supabase contourne toutes les règles de sécurité de la base. Elle se trouvait en clair dans des scripts du projet et dans des fichiers `.env` envoyés sur Git. Toute personne ayant accès au dépôt pouvait lire, modifier ou supprimer toutes les données.

**Corrections.**
- Les scripts d'administration (`create_admin.js`, `create_bucket.js`, `create_test_shop.js`) lisent désormais leurs clés dans les variables d'environnement. Exemple d'utilisation :
  ```bash
  node --env-file=server/.env create_admin.js
  ```
- Les fichiers `.env` ont été retirés du suivi Git (`git rm --cached`). Ils sont maintenant ignorés : `.env`, `server/.env` et `.env.paydunya` figurent dans `.gitignore`. La dernière ligne du `.gitignore`, mal encodée, a été réparée.
- Les clés PayDunya, WhatsApp (Meta ou UltraMsg) et `service_role` n'existent que sur le serveur et dans les fonctions Edge. Le site ne contient que la clé **publique** (`anon`), conçue pour être visible.

**Point d'attention.** Une clé publiée dans l'historique Git reste lisible dans les anciennes versions. La seule protection complète est de **régénérer la clé `service_role`** dans Supabase (voir [section 7](#7-limites-connues-et-actions-restantes)).

---

### 4.2 Commandes et paiements

#### a) Prix recalculés, jamais pris dans le navigateur

**Risque.** Le total d'une commande était envoyé par le navigateur. Un client malin pouvait commander un article à 25 000 F pour 1 F.

**Correction en base** : trigger `orders_enforce_integrity` dans `security_fixes.sql`. Il s'exécute avant chaque enregistrement de commande, quelle que soit son origine, et :
- vérifie que chaque produit existe **et appartient à la boutique** ;
- refuse les quantités hors de 1 à 100 ;
- reprend le **prix réel** de chaque produit et le libellé (le nom peut contenir la variante choisie, jamais le nom d'un autre produit) ;
- ajoute les frais de la **zone de livraison active** de la boutique, ou des zones par défaut ;
- impose le statut `PENDING`, le paiement `PENDING`, aucun livreur et aucune date de livraison ;
- génère un code PIN si celui reçu n'est pas composé de 4 chiffres.

**Correction sur le serveur** (`server/routes/payment.js`, route `/api/payments/create`). Avant de créer une facture PayDunya, le serveur :
- vérifie la boutique, chaque article (quantité entière de 1 à 100) et la zone de livraison ;
- relit les prix en base et calcule lui-même le total ;
- tire le code PIN avec un générateur cryptographique (`crypto.randomInt`) ;
- envoie à PayDunya le montant **enregistré en base**, jamais celui du navigateur.

#### b) Notifications de paiement (IPN) vérifiées

**Risque.** N'importe qui pouvait envoyer une fausse notification « paiement réussi » et faire passer une commande pour payée, voire déclencher un reversement.

**Correction** (route `/api/payments/webhook`). Le serveur procède en quatre étapes :
1. **Signature** : il compare le `hash` reçu au SHA-512 de la clé principale PayDunya, avec une comparaison à temps constant (`crypto.timingSafeEqual`), qui ne laisse rien deviner.
2. **Reconfirmation** : il interroge lui-même PayDunya (`checkout-invoice/confirm/{token}`) et ne retient que le statut `completed`.
3. **Montant** : il compare le montant payé au montant de la commande. En cas d'écart, la commande est marquée `AMOUNT_MISMATCH` et rien n'est validé.
4. **Idempotence** : la commande ne passe de `PENDING` à `PREPARING` qu'une seule fois. Une notification rejouée ne déclenche donc **jamais un second reversement** au marchand.

---

### 4.3 Abonnements des marchands

**Risque.** L'activation d'un forfait payant se faisait depuis le navigateur après le retour de PayDunya. Il suffisait de visiter l'adresse de retour pour obtenir Pro ou Premium gratuitement.

**Corrections.**
- **Colonnes verrouillées en base** : trigger `merchants_protect_billing` (`security_fixes.sql`).
  - Un marchand ne peut modifier ni `subscription_plan`, ni `subscription_status`, ni `subscription_end_date`, ni `is_suspended`.
  - À la création d'un compte, le forfait est forcé à « Débutant ».
  - Seuls le serveur (clé `service_role`) et l'administrateur validé par double authentification peuvent changer ces valeurs.
- **Fonction Edge `paydunya-checkout`** :
  - identifie le marchand grâce à son jeton de connexion ;
  - fixe le prix côté serveur (Pro 5 000 F, Premium 15 000 F) ;
  - le mode « démo » qui activait sans payer a été supprimé.
- **Fonction Edge `paydunya-webhook`** :
  - vérifie la signature, reconfirme auprès de PayDunya, contrôle que le montant correspond exactement au forfait ;
  - inscrit le paiement dans `subscription_payments`. La clé unique `invoice_token` garantit qu'**un même paiement ne prolonge l'abonnement qu'une fois**.
- **Tableau de bord** : il n'active plus rien. Il attend que le serveur ait validé le paiement, en relisant la fiche toutes les 3 secondes.

---

### 4.4 Contrôle d'accès à la base de données

Supabase expose la base au navigateur avec la clé publique. La sécurité repose donc sur trois mécanismes PostgreSQL.

#### a) RLS (Row Level Security) : qui voit quelles lignes

Chaque table a la RLS activée.

| Table | Règle |
|---|---|
| `orders` | Le marchand voit ses commandes. Les visiteurs n'ont **aucun accès direct** : ils passent par des fonctions contrôlées. |
| `products` | Lecture publique (catalogue). Écriture par le marchand propriétaire uniquement. |
| `drivers` | Le marchand gère ses livreurs. Aucune lecture publique (numéro de CNI et téléphone protégés). |
| `merchant_locations` | Le marchand propriétaire et l'administrateur. |
| `notification_outbox`, `delivery_positions` | Le marchand concerné et l'administrateur. |
| `security_attempts`, `driver_sessions`, `subscription_payments`, `platform_admins` | Aucune règle d'accès : réservées au serveur. |

Les anciennes règles « ouvertes à tous » (`USING (true)`) ont été supprimées automatiquement :
- sur `orders`, en lecture comme en écriture ;
- sur `reviews`, en écriture ;
- sur `drivers`, s'il en existait une.

Le script les détecte dans `pg_policies` et les retire, ce qui couvre aussi les règles créées à la main dans le tableau de bord Supabase.

#### b) Droits par colonne : quelles informations d'une ligne sont lisibles

Introduits par `security_fixes_3.sql` pour les cas où une ligne doit rester publique sans que toutes ses colonnes le soient.

- **`merchants`** : les visiteurs et les autres marchands ne lisent que les colonnes de la vitrine : `id`, `shop_name`, `phone_number`, `email`, `address`, `logo_url`, `banner_url`, `description`, `theme_color`, `layout_style`, `social_links`, `delivery_zones`, `subscription_plan`, `is_suspended`, `created_at`.
  - Le **numéro et l'opérateur de reversement**, la **date de fin d'abonnement** et les **réglages internes** ne sont plus lisibles.
  - Le marchand lit sa fiche complète grâce à la fonction `get_my_merchant()`, qui ne renvoie que la ligne de l'utilisateur connecté.
  - Insertion et suppression de fiches marchands sont interdites depuis le site : les fiches sont créées par le trigger d'inscription.
- **`reviews`** : toutes les colonnes restent lisibles **sauf `order_id`**. L'insertion et la modification directes sont interdites : seul `submit_review` publie un avis.

```sql
-- Principe appliqué (extrait de security_fixes_3.sql)
REVOKE SELECT ON public.merchants FROM anon, authenticated;
GRANT SELECT (id, shop_name, phone_number, ...) ON public.merchants TO anon, authenticated;
```

#### c) Fonctions contrôlées (`SECURITY DEFINER`)

Les opérations sensibles passent par des fonctions SQL qui vérifient tout avant d'agir. On peut les voir comme des « guichets » : le visiteur n'entre pas dans la réserve, il demande au guichet, qui contrôle sa demande.
- Toutes fixent leur `search_path`, ce qui empêche le détournement par des objets portant le même nom.
- Les fonctions internes (`client_ip`, `attempts_count`, `attempts_log`, `driver_session`, `order_receipt`, `enqueue_order_notification`…) sont **retirées des droits publics** (`REVOKE ALL … FROM PUBLIC, anon, authenticated`) : impossible de les appeler depuis le navigateur.
- `claim_notifications` (file WhatsApp) n'est exécutable que par le serveur (`service_role`).

---

### 4.5 Espace livreur

**Risque initial.** Le livreur était identifié par un nom transmis par le navigateur. En changeant ce nom, on pouvait voir et valider les courses d'un autre livreur, ou d'une autre boutique.

**Correction : sessions à jeton** (`security_fixes_2.sql`).
- **Connexion** : `authenticate_driver(boutique, téléphone, CNI)`.
  - La boutique est comparée à l'identique (sans jokers « % » possibles).
  - Si tout est correct, un **jeton aléatoire de 32 octets** est créé. Le livreur le reçoit ; la base n'en garde que l'**empreinte SHA-256**. Le jeton expire au bout de **12 heures**.
- Chaque action du livreur présente ce jeton, vérifié par `driver_session()`. Si le jeton est expiré ou si le marchand a supprimé le livreur, la réponse est `SESSION_EXPIREE` et le site renvoie à l'écran de connexion.
- **Courses visibles** : uniquement celles de **sa** boutique (à prendre, sa course en cours, ses livraisons du jour). Le **téléphone du client** n'est communiqué qu'au livreur qui a accepté la course.
- **Acceptation** : un verrou de ligne (`FOR UPDATE`) empêche deux livreurs de prendre la même course. Un livreur ne peut avoir qu'une course en cours à la fois.
- **Validation par code PIN** :
  - au-delà de 5 erreurs en 15 minutes, il faut patienter ;
  - après 10 erreurs, la course est bloquée définitivement et seule la boutique peut la valider.
- **Côté site** : seuls le nom et le jeton sont gardés, en `sessionStorage`, effacé à la fermeture de l'onglet. Le numéro de CNI n'est **jamais conservé**. L'ancienne clé locale qui stockait téléphone et CNI est supprimée au chargement.

---

### 4.6 Parcours client : commande, suivi, reçu, avis

| Fonction | Protection |
|---|---|
| `place_order` (paiement à la livraison) | Coordonnées validées (longueurs). **20 commandes par heure et par adresse IP** au maximum. Total recalculé par le trigger d'intégrité. |
| `track_order` (suivi) | Téléphone **et** code PIN obligatoires. 5 erreurs par 15 min par numéro, 30 par adresse IP. |
| `get_order_receipt` (retour de paiement) | Uniquement pour les **paiements en ligne de moins de 2 heures** (`security_fixes_3.sql`). |
| `submit_review` (avis) | Note de 1 à 5 ; commentaire de 3 à 1 000 caractères ; produit existant. **3 avis par heure et par IP**, **30 par jour et par produit**. Badge « Achat vérifié » seulement si la commande est livrée et contient le produit. |

**Fuite corrigée.** Les avis vérifiés affichaient publiquement l'identifiant de la commande, et `get_order_receipt` renvoyait alors le reçu complet : nom, téléphone, adresse et code de livraison du client. L'identifiant n'est plus lisible et la fonction de reçu est restreinte.

---

### 4.7 Administration de la plateforme

#### a) Rôle administrateur stocké en base

Avant, le site décidait qui était administrateur en comparant l'email à une adresse écrite dans son code. Désormais, la table `platform_admins` (RLS sans règle publique) liste les administrateurs, et la fonction `is_platform_admin()` est utilisée **partout** :
- les fonctions du tableau de bord admin (`admin_merchants_overview`, `admin_platform_series`) ;
- les règles d'accès aux positions, notifications et localisations ;
- la règle de modification des marchands, par exemple pour suspendre une boutique ;
- le verrou des abonnements.

Pour ajouter un administrateur, exécutez dans l'éditeur SQL :
```sql
INSERT INTO public.platform_admins (user_id)
SELECT id FROM auth.users WHERE email = 'adresse@exemple.com'
ON CONFLICT DO NOTHING;
```

#### b) Double authentification obligatoire (MFA)

**Risque.** Un mot de passe administrateur volé, deviné ou partagé donnait accès à toutes les boutiques.

**Correction** (`security_fixes_3.sql` + `src/components/admin/AdminMfaGate.jsx`) :
- **En base** : `is_platform_admin()` exige que la session soit au **niveau `aal2`**, c'est-à-dire validée par un code à 6 chiffres. Sans ce code, la base refuse les données administrateur, **même avec le bon mot de passe**. Une seconde fonction, `is_platform_admin_account()`, sert seulement à savoir s'il faut afficher l'écran de double authentification.
- **Sur le site** : avant d'ouvrir l'espace admin, l'écran `AdminMfaGate`
  - propose d'activer la double authentification (QR code à scanner avec Google Authenticator ou Microsoft Authenticator, clé de secours affichée) ;
  - ou demande le code à chaque nouvelle connexion ;
  - supprime au passage un enrôlement commencé puis abandonné, qui bloquerait le suivant.
- **Perte du téléphone** : supprimez le facteur dans Supabase (Authentication → Users), puis reconfigurez.

---

### 4.8 Lutte contre les abus et les robots

#### a) Limites d'essais en base de données

La table `security_attempts` enregistre les échecs, par type d'action et par sujet : numéro de téléphone, commande, adresse IP. L'adresse IP réelle est lue dans les en-têtes transmis par Supabase (`cf-connecting-ip`, `x-forwarded-for`), grâce à la fonction interne `client_ip()`.

| Action | Limite |
|---|---|
| Connexion livreur | 5 échecs / 15 min par boutique + téléphone ; 20 par IP |
| Code PIN de livraison | 5 erreurs / 15 min ; blocage après 10 erreurs |
| Suivi de commande | 5 erreurs / 15 min par numéro ; 30 par IP |
| Commande à la livraison | 20 commandes / heure par IP |
| Avis clients | 3 / heure par IP ; 30 / jour par produit |
| Messages WhatsApp vers un client | 6 / heure par numéro (empêche d'utiliser une boutique pour harceler quelqu'un) |

#### b) Limites sur le serveur de paiement

Voir [section 4.10](#410-serveur-de-paiement-express) : 10 créations de paiement par 10 minutes et 300 demandes par 15 minutes, par adresse IP.

#### c) Captcha Cloudflare Turnstile

- **Composant** : `src/components/auth/Turnstile.jsx`. Il est intégré à la **connexion**, à l'**inscription** et à **« mot de passe oublié »**.
- **Fonctionnement** : Turnstile vérifie en arrière-plan que le visiteur est humain, le plus souvent sans rien lui demander. Le jeton obtenu est transmis à Supabase, qui le contrôle. Un jeton ne sert qu'une fois : après chaque tentative, le widget est réinitialisé.
- **Activation** : il ne s'active que si la clé `VITE_TURNSTILE_SITE_KEY` est définie et si le captcha est activé dans Supabase. La marche à suivre est dans `GUIDE_SECURITE.md`.

---

### 4.9 Protection dans le navigateur (Vercel)

**Risque.** Sans en-têtes de sécurité, un site malveillant pouvait afficher SamaBoutik dans un cadre invisible pour piéger les marchands (attaque dite « clickjacking »). Rien ne limitait non plus les sources de code exécutées par la page.

**Correction** : section `headers` de `vercel.json`, appliquée à toutes les pages.

| En-tête | Valeur | Rôle |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Impose HTTPS pendant 2 ans (pas de version non chiffrée) |
| `X-Frame-Options` | `DENY` | Interdit d'afficher le site dans un autre site |
| `X-Content-Type-Options` | `nosniff` | Empêche le navigateur de « deviner » le type d'un fichier (exécution détournée) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Ne transmet pas l'adresse complète des pages aux sites externes |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isole la fenêtre du site des fenêtres ouvertes par d'autres sites |
| `Permissions-Policy` | caméra, micro, paiement, USB désactivés ; localisation pour le site seul | Limite les fonctions sensibles du navigateur |
| `Content-Security-Policy` | voir ci-dessous | Liste blanche des sources autorisées |

**Détail de la politique de contenu (CSP).**

| Règle | Autorisé | Pourquoi |
|---|---|---|
| `script-src` | le site + Cloudflare Turnstile | Aucun script externe ou injecté ne peut s'exécuter |
| `style-src` | le site, styles en ligne, Google Fonts | Nécessaire aux animations de l'interface |
| `font-src` | le site, Google Fonts | Police Plus Jakarta Sans |
| `img-src` | le site, `data:`, `blob:`, HTTPS | Photos des produits (Supabase Storage), tuiles de carte |
| `connect-src` | le site, Supabase (HTTPS + temps réel), HTTPS | Base de données et serveur de paiement |
| `frame-src` | OpenStreetMap, Cloudflare Turnstile | Carte de localisation, captcha |
| `object-src` | aucun | Pas de plugins (Flash, etc.) |
| `frame-ancestors` | aucun | Double protection anti-clickjacking |
| `base-uri`, `form-action` | le site | Empêche de détourner les liens et formulaires |
| `upgrade-insecure-requests` | — | Toute ressource HTTP est chargée en HTTPS |

Les fichiers compilés (`/assets/`) sont aussi mis en cache un an (`immutable`), et les images et logos un mois.

---

### 4.10 Serveur de paiement (Express)

Fichier : `server/index.js`.

| Protection | Mise en œuvre |
|---|---|
| **CORS limité** | Seules les adresses listées dans `FRONTEND_URL` peuvent appeler l'API depuis un navigateur. Les appels de serveur à serveur (notification PayDunya) n'ont pas d'origine et restent acceptés. |
| **Helmet** | En-têtes de sécurité standard sur toutes les réponses : HSTS, `nosniff`, anti-iframe… Le serveur ne révèle plus sa technologie (`x-powered-by` désactivé). |
| **Limite générale** | 300 demandes par 15 minutes et par adresse IP. |
| **Limite des paiements** | 10 créations de paiement par 10 minutes et par adresse IP. Elle empêche un robot de créer des milliers de commandes et factures. |
| **Notifications PayDunya jamais bloquées** | La route `/api/payments/webhook` est exclue des limites : chaque notification est de toute façon vérifiée par signature. |
| **Taille des requêtes** | 100 Ko maximum, en JSON comme en formulaire. |
| **Adresse IP réelle** | `trust proxy` est activé pour lire l'adresse du visiteur derrière l'hébergeur (Render, Railway…). |
| **Messages en français** | En cas de blocage : « Trop de demandes. Réessayez dans quelques minutes. », lisible par le site grâce au placement après CORS. |
| **Avis publics** | La route `GET /api/reviews/:id` ne renvoie que les colonnes publiques, sans identifiant de commande. L'ancienne route d'écriture, qui insérait avec la clé `service_role` sans contrôle, a été supprimée. |

---

### 4.11 Comptes et mots de passe

- **Longueur minimale de 8 caractères** à l'inscription et lors d'un nouveau mot de passe, avec un indicateur de robustesse (majuscules, chiffres, symboles). La même valeur est à régler dans Supabase pour l'imposer aussi côté serveur.
- **« Mot de passe oublié »** :
  - le lien est envoyé par Supabase et mène à la page `/nouveau-mot-de-passe`, seule adresse de retour autorisée ;
  - le message affiché est **identique, que le compte existe ou non** (« Si un compte existe pour… ») : on ne peut pas s'en servir pour savoir qui est inscrit ;
  - un lien expiré ou déjà utilisé est détecté et refusé proprement.
- **Messages d'erreur génériques** : « Email ou mot de passe incorrect » ne précise pas lequel des deux est faux. Les erreurs techniques ne sont pas affichées telles quelles (`src/utils/authErrors.js`).
- **Numéro WhatsApp normalisé** à l'inscription (`+221` + 9 chiffres), pour que les liens et messages partent vers le bon destinataire.

---

### 4.12 Données personnelles et fonctionnalités récentes

| Fonctionnalité | Protection de la vie privée |
|---|---|
| **Localisation des boutiques** | Visible seulement par le marchand et l'administrateur. Coordonnées vérifiées. Une position invalide ne bloque jamais l'inscription. |
| **Annuaire « Boutiques près de moi »** | **Sur accord explicite** du marchand (désactivé par défaut). La fonction publique ne renvoie ni téléphone, ni email, ni données de paiement. Les boutiques suspendues sont retirées. |
| **Suivi du livreur en direct** | Seul le **livreur assigné**, avec un jeton valide, peut envoyer la position de **sa** course en cours, au plus une fois toutes les 3 secondes. La trace est limitée à 60 points. Le client ne voit la position et le téléphone du livreur **que pendant la livraison**. Les positions sont **effacées au bout de 2 jours**. |
| **Notifications WhatsApp** | Chaque message est placé dans une file d'attente que seul le serveur peut lire. Les clés du fournisseur sont sur le serveur uniquement. Maximum 6 messages par heure vers un même numéro. Une panne de WhatsApp **ne bloque jamais une commande**. Le marchand peut couper les messages. |
| **Code de livraison** | Envoyé au client uniquement (reçu, suivi, WhatsApp). Il prouve que le colis a été remis à la bonne personne. |

---

### 4.13 Code de l'application web

- **Pas d'injection de HTML** : aucune utilisation de `dangerouslySetInnerHTML`. React échappe automatiquement les textes affichés.
- **Cartes Leaflet** : les épingles construites en HTML échappent les noms de boutiques (`escapeHtml`). Couleurs et adresses d'images sont validées (`safeColor`, `safeUrl`) avant d'être insérées.
- **Lectures minimales** : la vitrine demande uniquement les colonnes dont elle a besoin. Le profil complet du marchand passe par `get_my_merchant`.
- **Stockage dans le navigateur** : les favoris restent en `localStorage` ; la session livreur (nom et jeton seulement) va en `sessionStorage`. Aucun mot de passe, numéro de CNI ou clé secrète n'y est stocké.
- **Dépendances** : `npm audit` ne signale **aucune vulnérabilité connue**, ni pour le site ni pour le serveur (vérifié le 4 octobre 2026).

---

## 5. Comment tout cela a été vérifié

Chaque correction a été testée avant d'être livrée.

| Vérification | Méthode | Résultat |
|---|---|---|
| Correctifs de sécurité de base (`security_fixes.sql`, `security_fixes_2.sql`) | Base PostgreSQL simulée (PGlite), avec les rôles de Supabase (visiteur, connecté, serveur) | 43 scénarios réussis |
| Localisation et administration (`admin_locations.sql`) | Même méthode | 23 scénarios réussis |
| Fonctionnalités récentes (`new_features.sql`) | Même méthode | 56 scénarios réussis |
| Fuites de données et double authentification (`security_fixes_3.sql`) | Même méthode, dont des sessions avec et sans code à 6 chiffres | 47 scénarios réussis |
| Serveur : en-têtes, limites, CORS | Serveur démarré, demandes réelles | 7 tests réussis |
| Serveur : paiements et WhatsApp | Services externes simulés | 10 tests réussis |
| En-têtes Vercel et CSP | Version compilée servie avec les mêmes en-têtes, contrôle dans Chrome | 7 pages : 0 blocage, 0 erreur |
| Captcha sous CSP | Clé de test Cloudflare | Widget affiché et validé |
| Dépendances | `npm audit` | 0 vulnérabilité |

Exemples de scénarios testés :
- un visiteur ne peut plus lire un numéro de reversement ;
- un marchand ne peut pas modifier la boutique d'un autre ni s'offrir un forfait ;
- sans code à 6 chiffres, la suspension d'une boutique par l'admin est refusée ;
- une notification PayDunya rejouée ne crée pas de doublon ;
- une panne de la file WhatsApp ne bloque pas une commande ;
- un autre livreur ne peut pas usurper la position GPS d'une course.

---

## 6. Ordre d'installation des scripts SQL

À exécuter dans **Supabase → SQL Editor**, dans cet ordre. Chaque script peut être relancé sans risque.

| Ordre | Script | Contenu |
|---|---|---|
| 1 | `security_fixes.sql` | Intégrité des commandes, verrou des abonnements, journal des paiements |
| 2 | `security_fixes_2.sql` | Sessions livreurs, limites d'essais, rôle admin, commande et suivi contrôlés, avis, stockage |
| 3 | `admin_locations.sql` | Localisation des boutiques, fonctions du tableau de bord admin |
| 4 | `new_features.sql` | Notifications WhatsApp, annuaire, suivi GPS, mots-clés |
| 5 | `security_fixes_3.sql` | Droits par colonne, reçu restreint, accès anonymes fermés, double authentification admin |

> ⚠️ Déployez la nouvelle version du site **avant** le script 5. Si vous relancez un jour `admin_locations.sql`, relancez ensuite `new_features.sql`.

---

## 7. Limites connues et actions restantes

Aucune application n'est invulnérable. Voici, en toute transparence, ce qui reste à faire ou à surveiller.

### Actions à faire par le propriétaire (prioritaires)

- [ ] **Régénérer la clé `service_role`** dans Supabase (Settings → API), puis mettre à jour `server/.env`, l'hébergeur du serveur et les secrets des fonctions Edge. L'ancienne clé figure dans l'historique Git.
- [ ] **Changer les mots de passe** de `admin@samaboutik.com` et de `admin2@samaboutik.com` (ce dernier a circulé en clair).
- [ ] **Déployer** serveur, puis site, puis exécuter `security_fixes_3.sql` (voir `GUIDE_SECURITE.md`).
- [ ] **Configurer la double authentification** du compte admin.
- [ ] **Régler Supabase** : mots de passe de 8 caractères minimum, confirmation des emails activée, MFA « TOTP » activé.
- [ ] **Activer le captcha Turnstile** (gratuit), recommandé dès que la plateforme est publique.

### Améliorations possibles

| Point | Explication | Piste |
|---|---|---|
| CSP `connect-src` large | Le site peut contacter toute adresse HTTPS, car l'adresse du serveur de paiement n'était pas connue au moment de l'écriture. | Restreindre à Supabase + l'adresse exacte du serveur. |
| Styles en ligne autorisés | `'unsafe-inline'` est requis pour les styles par les animations. Les **scripts** restent strictement limités. | Acceptable ; à revoir si la bibliothèque d'animation évolue. |
| Limites du serveur en mémoire | Les compteurs sont propres à chaque instance et repartent à zéro à chaque redémarrage. | Suffisant avec un seul serveur ; prévoir Redis si plusieurs instances. |
| Paiements non testés en conditions réelles | Le format exact des notifications PayDunya et les fonctions Edge n'ont pas pu être testés avec de vrais paiements. | Faire un paiement test en mode « sandbox » PayDunya avant le lancement. |
| Historique Git | D'anciennes clés restent lisibles dans les premiers commits. | Régénérer les clés (indispensable) ; purge de l'historique facultative. |
| Surveillance | Aucune alerte automatique en cas d'erreur ou d'attaque. | Prochaine étape : Sentry (gratuit) et alertes Supabase. |
| Sauvegardes | Les sauvegardes automatiques dépendent du forfait Supabase. | Vérifier le forfait ; exporter régulièrement la base. |
| Cadre légal | Des données personnelles sont traitées : noms, téléphones, adresses, positions GPS. | Rédiger une politique de confidentialité et vérifier les obligations auprès de la CDP (loi sénégalaise n° 2008-12 sur les données personnelles). |

---

## 8. Annexe : fichiers liés à la sécurité

| Fichier | Rôle |
|---|---|
| `security_fixes.sql` | Intégrité des commandes, verrou des abonnements, journal des paiements |
| `security_fixes_2.sql` | Livreurs, limites d'essais, admin, fonctions client, avis, stockage |
| `admin_locations.sql` | Localisation (RLS) et fonctions admin |
| `new_features.sql` | WhatsApp, annuaire, suivi GPS (avec leurs protections) |
| `security_fixes_3.sql` | Droits par colonne, accès anonymes, double authentification |
| `server/index.js` | CORS, Helmet, limites de demandes |
| `server/routes/payment.js` | Recalcul des montants, vérification des notifications, reversement unique |
| `server/routes/reviews.js` | Lecture publique des avis, sans données sensibles |
| `server/lib/whatsapp.js`, `notificationWorker.js` | Envoi WhatsApp avec secrets côté serveur |
| `supabase/functions/paydunya-checkout/index.ts` | Paiement des abonnements (prix fixés côté serveur) |
| `supabase/functions/paydunya-webhook/index.ts` | Activation des abonnements après vérification |
| `vercel.json` | En-têtes de sécurité du site |
| `src/contexts/AuthContext.jsx` | Profil via `get_my_merchant`, rôle admin vérifié en base, captcha |
| `src/components/admin/AdminMfaGate.jsx` | Écran de double authentification |
| `src/components/auth/Turnstile.jsx` | Captcha anti-robots |
| `src/pages/Login.jsx`, `Register.jsx`, `ResetPassword.jsx` | Validation, mots de passe, captcha |
| `src/utils/authErrors.js` | Messages d'erreur sans fuite d'information |
| `.gitignore` | Exclusion des fichiers de secrets |
| `GUIDE_SECURITE.md` | Mise en ligne pas à pas |
