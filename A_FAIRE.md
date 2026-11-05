# Ce qu'il vous reste à faire

Suivez les étapes **dans l'ordre**. Cochez chaque case une fois l'étape faite.
Les étapes marquées *(facultatif)* peuvent attendre.

---

## Étape 1 · Sécuriser vos comptes (urgent, 10 minutes)

- [ ] **Régénérer la clé `service_role`** : Supabase → Project Settings → API → *Generate new service_role key*. Notez la nouvelle clé : elle sert à l'étape 2.
- [ ] **Changer le mot de passe** de `admin@samaboutik.com`.
- [ ] **Changer le mot de passe** de `admin2@samaboutik.com`. L'ancien a circulé en clair dans notre conversation.

---

## Étape 2 · Serveur de paiement

> Si le serveur n'est pas encore hébergé (Render, Railway…), c'est la première chose à faire. Sans lui, le paiement Wave / Orange Money et les notifications WhatsApp ne fonctionnent pas.

- [ ] Vérifier que l'hébergeur utilise **Node 20.19 ou plus récent**.
- [ ] Renseigner ces réglages chez l'hébergeur (variables d'environnement) :

| Nom | Valeur |
|---|---|
| `SUPABASE_URL` | l'adresse de votre projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | la **nouvelle** clé de l'étape 1 |
| `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN` | vos clés PayDunya |
| `FRONTEND_URL` | `https://samaboutik-nine.vercel.app` |
| `BACKEND_URL` | ⚠️ **manquant aujourd'hui** : l'adresse publique du serveur (ex. `https://samaboutik-api.onrender.com`). Sans elle, PayDunya ne peut pas confirmer les paiements. |

- [ ] Lancer `npm install` dans le dossier `server/` (nouvelles dépendances : `helmet`, `express-rate-limit`, `@sentry/node`).
- [ ] Redéployer le serveur.
- [ ] Vérifier qu'il répond : ouvrez `https://VOTRE-SERVEUR/health` → vous devez lire `"status":"OK"`.
- [ ] Mettre à jour la clé `service_role` aussi dans `server/.env` sur votre ordinateur.

---

## Étape 3 · Site (Vercel)

- [ ] Dans **Vercel → Settings → Environment Variables**, vérifier :

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | l'adresse de votre projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | la clé publique (*anon*) de Supabase |
| `VITE_API_URL` | ⚠️ **à vérifier** : l'adresse du serveur de paiement (la même que `BACKEND_URL`). Sans elle, le paiement en ligne échoue. |

- [ ] Redéployer le site.

---

## Étape 4 · Base de données (Supabase → SQL Editor)

À faire **après** l'étape 3 : l'ancienne version du site ne fonctionne plus une fois `security_fixes_3.sql` exécuté.

- [ ] Exécuter **`new_features.sql`**, s'il ne l'a pas déjà été. Il active les notifications WhatsApp, l'annuaire des boutiques et le suivi du livreur en direct.
- [ ] Exécuter **`security_fixes_3.sql`**.

Rappel de l'ordre complet, si vous repartez de zéro : `security_fixes.sql` → `security_fixes_2.sql` → `admin_locations.sql` → `new_features.sql` → `security_fixes_3.sql`.

---

## Étape 5 · Réglages Supabase (Authentication)

- [ ] **URL Configuration** :
  - *Site URL* : `https://samaboutik-nine.vercel.app`
  - *Redirect URLs* : `https://samaboutik-nine.vercel.app/**` et `https://samaboutik-nine.vercel.app/nouveau-mot-de-passe`
- [ ] **Passwords** : longueur minimale **8**.
- [ ] **Emails** : laisser la confirmation des emails **activée**.
- [ ] **Multi-Factor** : activer **TOTP**.

---

## Étape 6 · Double authentification de l'admin

- [ ] Installer **Google Authenticator** ou **Microsoft Authenticator** sur votre téléphone.
- [ ] Vous connecter avec le compte admin, cliquer sur **Configurer maintenant**, scanner le QR code et saisir le code à 6 chiffres.

En cas de perte du téléphone : Supabase → Authentication → Users → votre compte → supprimer le facteur, puis recommencer.

---

## Étape 7 · Vérifier que tout marche (15 minutes)

Avec une boutique de test :

- [ ] Créer une boutique, ajouter un produit avec photo. Le message « Photo allégée » doit s'afficher.
- [ ] Choisir un thème dans Paramètres → Apparence et ouvrir **Aperçu**.
- [ ] Depuis un autre téléphone, commander avec **paiement à la livraison**, puis suivre la commande avec le téléphone et le code PIN.
- [ ] Ajouter un livreur, se connecter avec son lien, accepter la course, puis la valider avec le code PIN.
- [ ] Faire un **petit paiement Wave ou Orange Money** et vérifier que la commande passe en « En préparation ».
- [ ] Se connecter en admin : le code à 6 chiffres doit être demandé.

---

## Facultatif · quand vous voulez

- [ ] **Notifications WhatsApp** : voir `GUIDE_NOUVELLES_FONCTIONNALITES.md`. Deux possibilités :
  - Meta : réglages `WHATSAPP_PROVIDER=meta`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, et 5 modèles de messages à faire valider ;
  - UltraMsg : réglages `WHATSAPP_PROVIDER=ultramsg`, `ULTRAMSG_INSTANCE_ID`, `ULTRAMSG_TOKEN`.
- [ ] **Captcha anti-robots (Cloudflare Turnstile)** : voir `GUIDE_SECURITE.md`, étape 6. Faites les deux réglages en même temps :
  - Supabase → Attack Protection : clé **secrète** ;
  - Vercel → `VITE_TURNSTILE_SITE_KEY` : clé **du site**.
- [ ] **Surveillance des erreurs (Sentry)** : voir `GUIDE_FIABILITE.md`. Réglages `VITE_SENTRY_DSN` (Vercel) et `SENTRY_DSN` (serveur). Activez la double authentification sur votre compte Sentry.

---

## À chaque future modification du code

- [ ] Lancer `npm test` avant de mettre en ligne. Si un test échoue, ne pas déployer.
