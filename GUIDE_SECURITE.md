# Guide : mise en ligne du chantier sécurité

## Ce qui a été corrigé

| Problème | Correction |
|---|---|
| La table des marchands était lisible par tout le monde (numéros de reversement Wave/OM, abonnements) | Seules les infos de la vitrine restent publiques ; le marchand lit sa fiche complète via `get_my_merchant` |
| Les avis affichaient l'identifiant de commande, qui donnait accès au reçu complet du client (nom, téléphone, adresse, code) | Identifiant masqué ; reçu limité aux paiements en ligne de moins de 2 h |
| Accès direct possible aux tables sensibles (commandes, livreurs…) | Fermé aux visiteurs : ils passent uniquement par les fonctions prévues |
| Admin protégé par un simple mot de passe | Double authentification obligatoire (code à 6 chiffres) |
| Site affichable dans un faux site, pas de règles de sécurité navigateur | En-têtes de sécurité sur Vercel (`vercel.json`) |
| Serveur de paiement sans limite (robots) | 10 créations de paiement par 10 minutes et par visiteur, 300 demandes par 15 minutes au total, en-têtes Helmet |
| Mots de passe de 6 caractères | 8 caractères minimum |
| Inscriptions par des robots | Captcha Cloudflare Turnstile, prêt à activer (gratuit) |

## Mise en ligne : dans cet ordre

### 1. Serveur de paiement
Lancez `npm install` dans `server/` (deux nouvelles dépendances : `helmet` et `express-rate-limit`), puis redéployez le serveur.

### 2. Site (Vercel)
Redéployez le site. Il fonctionne avant comme après le script SQL de l'étape 3.

### 3. Base de données
Dans Supabase, ouvrez **SQL Editor** et exécutez **`security_fixes_3.sql`**.

> ⚠️ Faites-le **après** l'étape 2 : l'ancienne version du site lisait toute la table des marchands, et cet accès est désormais fermé.

### 4. Double authentification de l'admin
1. Installez **Google Authenticator** ou **Microsoft Authenticator** sur votre téléphone.
2. Connectez-vous avec le compte admin, puis cliquez sur **Configurer maintenant**.
3. Scannez le QR code et saisissez le code à 6 chiffres.
4. À chaque nouvelle connexion, le code vous sera demandé.

Points à vérifier :
- **Si un message indique que la double authentification est désactivée**, activez « TOTP » dans **Supabase → Authentication → Multi-Factor**.
- **En cas de perte du téléphone**, supprimez le facteur dans **Supabase → Authentication → Users → (votre compte)**, puis reconfigurez.

### 5. Réglages Supabase (Authentication)
- **Policies / Passwords** : longueur minimale **8**.
- **Emails** : gardez la confirmation des emails activée.

### 6. Captcha (facultatif, recommandé)
1. Créez un widget gratuit sur **dash.cloudflare.com → Turnstile**, en indiquant votre domaine `samaboutik-nine.vercel.app`.
2. Dans **Supabase → Authentication → Attack Protection**, activez le captcha **Turnstile** et collez la **clé secrète**.
3. Dans **Vercel → Settings → Environment Variables**, ajoutez `VITE_TURNSTILE_SITE_KEY` avec la **clé du site**, puis redéployez.

> Faites les étapes 2 et 3 ensemble. Si le captcha est activé dans Supabase mais que la clé manque sur Vercel, les connexions échoueront.

## À faire de votre côté (rappel)
- [ ] **Régénérer la clé `service_role`** dans Supabase et mettre à jour `server/.env` et l'hébergeur.
- [ ] **Changer le mot de passe** de `admin@samaboutik.com` et de `admin2@samaboutik.com` (ce dernier a circulé en clair).
