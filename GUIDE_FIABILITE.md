# Guide : fiabilité de SamaBoutik

Ce chantier ajoute trois protections :

1. **La surveillance des erreurs (Sentry)** : vous êtes prévenu par email quand un client, un marchand ou un livreur rencontre un bug.
2. **Des tests automatiques** : 112 vérifications des parcours vitaux, lancées en une commande.
3. **Des messages clairs en cas de coupure internet**, au lieu de pages blanches ou de messages techniques.

---

## 1. Activer la surveillance des erreurs (gratuit)

Tant que les clés ne sont pas renseignées, la surveillance reste inactive et le site fonctionne normalement. Le code de surveillance n'est alors même pas inclus dans le site.

### Créer le compte
1. Créez un compte sur **sentry.io**. Choisissez l'hébergement des données en **Europe (EU)**.
2. Créez un premier projet de type **React**, nommé par exemple `samaboutik-site`.
3. Copiez sa clé **DSN** (elle ressemble à `https://abc123@o123.ingest.de.sentry.io/456`).
4. Créez un second projet de type **Node.js / Express**, nommé par exemple `samaboutik-serveur`, et copiez sa clé DSN.

### Brancher le site (Vercel)
Dans **Vercel → Settings → Environment Variables**, ajoutez :

| Nom | Valeur |
|---|---|
| `VITE_SENTRY_DSN` | la clé DSN du projet **React** |

Redéployez ensuite le site.

### Brancher le serveur de paiement
Chez l'hébergeur du serveur (Render, Railway…), ajoutez :

| Nom | Valeur |
|---|---|
| `SENTRY_DSN` | la clé DSN du projet **Node.js** |

Lancez ensuite `npm install` dans `server/` (nouvelle dépendance `@sentry/node`), puis redéployez. La commande de démarrage ne change pas (`npm start`).

### Ce qui est envoyé, et ce qui ne l'est jamais
- **Envoyé** : le message d'erreur, la page concernée (sans ses paramètres), le navigateur et l'identifiant anonyme du marchand connecté.
- **Jamais envoyé** :
  - les numéros de téléphone et les emails (remplacés par `[numéro]` et `[email]`) ;
  - les codes PIN, les adresses des clients et le contenu des formulaires ;
  - les paramètres des liens (`?suivi=…`, `?orderId=…`) ;
  - les messages de la console ;
  - les clés du serveur.
- Les erreurs survenues **hors connexion** ne sont pas signalées : ce ne sont pas des bugs.

### La référence d'erreur
Quand une page plante, l'utilisateur voit un écran clair avec une **référence** (ex. `7F3K9Q2B`). Si un marchand vous la transmet, recherchez-la dans Sentry (étiquette `reference`) pour retrouver l'erreur exacte.

---

## 2. Les tests automatiques

### Lancer les tests
À la racine du projet :

```bash
npm test
```

Les **112 tests** prennent quelques secondes. Ils ne contactent ni Supabase, ni PayDunya, ni WhatsApp :
- la base de données est un vrai PostgreSQL lancé en mémoire, sur lequel tous les scripts SQL du projet sont installés dans l'ordre du guide ;
- Supabase et PayDunya sont imités par de faux services locaux.

### Ce qui est vérifié

| Parcours | Exemples de vérifications |
|---|---|
| **Inscription** | La boutique est créée ; la position GPS est enregistrée ; un visiteur ne voit que la vitrine. |
| **Commande** | Le total est recalculé côté base, même si le prix a été modifié dans le navigateur. Les commandes invalides et les rafales de robots sont refusées. Le suivi exige le bon code, et les essais au hasard sont bloqués. |
| **Livraison** | La connexion du livreur exige téléphone + CNI. Deux livreurs ne peuvent pas prendre la même course. La livraison n'est validée qu'avec le bon code PIN. Le jeton ne sert plus après déconnexion. |
| **Paiement en ligne** | Le montant PayDunya vient de la base. Une notification falsifiée est rejetée. Un montant incohérent est signalé. Le reversement de 95 % n'a lieu qu'une fois, même si la notification est rejouée. Les robots sont bloqués. |
| **Avis** | Badge « achat vérifié », notes invalides et spam refusés. |
| **Sécurité** | Les données privées restent fermées, et l'administration exige la double authentification. |
| **Site** | Les 6 thèmes restent lisibles avec n'importe quelle couleur. Les données personnelles sont retirées des rapports d'erreur. Les messages de coupure s'affichent bien. |

> **Conseil** : lancez `npm test` avant chaque mise en ligne. Si un test échoue, ne déployez pas : il signale qu'une modification a cassé un parcours ou rouvert une faille.

### Sur GitHub
Si le projet est un jour hébergé sur GitHub, le fichier `.github/workflows/tests.yml` lance automatiquement les tests et la compilation à chaque envoi de code.

---

## 3. Coupures internet

| Situation | Ce que voit l'utilisateur |
|---|---|
| La connexion tombe | Un bandeau en haut de l'écran : « Pas de connexion internet. Vos actions ne peuvent pas être envoyées pour l'instant… ». |
| La connexion revient | « Connexion rétablie » pendant 3 secondes. |
| Une action échoue faute de réseau (commande, enregistrement, livraison…) | « Connexion internet perdue. Vérifiez votre réseau, puis réessayez. » au lieu d'un message technique. |
| Le serveur de paiement ne répond pas | « Le paiement en ligne est momentanément indisponible… », avec la suggestion de payer à la livraison. |
| Une page n'a pas pu se charger | Un écran « Pas de connexion internet » avec un bouton **Réessayer** : plus de rechargement en boucle ni de page d'erreur du navigateur. |
| Une nouvelle version du site vient d'être mise en ligne | La page se recharge **une seule fois** automatiquement pour récupérer la nouvelle version. |
