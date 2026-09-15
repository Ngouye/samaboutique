# 🚀 Guide Technique : Intégration de PayDunya dans Samaboutik

Ce document explique en détail tout ce que nous avons mis en place pour intégrer les paiements PayDunya (avec redistribution automatique) dans votre marketplace. Gardez ce fichier précieusement pour comprendre l'architecture et pouvoir la reproduire !

---

## 🏗️ 1. L'Architecture Globale

Pour des raisons de **sécurité**, l'intégration d'un moyen de paiement nécessite deux parties :
- **Le Frontend (React/Vite)** : Ce que voit l'utilisateur (le bouton "Payer").
- **Le Backend (Serveur Node.js)** : Un serveur privé qui cache vos clés secrètes PayDunya et communique de manière sécurisée avec la base de données.

Si nous avions mis les clés secrètes directement dans le Frontend, n'importe quel visiteur un peu curieux aurait pu les voler. C'est pourquoi nous avons créé le dossier `server/`.

---

## 🗄️ 2. La Base de Données (Supabase)

Pour que la redistribution automatique (Payout) fonctionne, le serveur doit savoir à qui envoyer l'argent. 
Nous avons donc ajouté deux nouvelles colonnes à la table `merchants` :
- `payout_provider` : (ex: 'WAVE' ou 'ORANGE_MONEY')
- `payout_phone_number` : (ex: '777777777')

Ces informations sont renseignées par le vendeur depuis son espace `MerchantDashboard.jsx`.

---

## 🔑 3. Les Variables d'Environnement (`.env`)

Dans le dossier `server/`, nous avons créé un fichier `.env`. Il contient vos clés secrètes. Le code utilise `process.env.NOM_DE_LA_VARIABLE` pour les lire sans jamais les exposer au public.

```env
# Clés Supabase (Le Service Role Key donne les droits d'admin au serveur)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Clés PayDunya (Master, Private, Public, Token)
PAYDUNYA_MASTER_KEY=...
PAYDUNYA_PRIVATE_KEY=...
# etc...
```

---

## ⚙️ 4. La Création du Paiement (Route `/create`)

**Fichier :** `server/routes/payment.js`

Quand le client clique sur "Payer", le frontend envoie une requête POST à notre serveur sur l'adresse `http://localhost:3000/api/payments/create`.

**Ce que fait le serveur à ce moment-là :**
1. Il enregistre la commande dans Supabase avec le statut `PENDING` (En attente).
2. Il prépare un *payload* (un bloc de données JSON) contenant le nom de la boutique, le montant, et l'ID de la commande.
3. Il envoie ce payload à l'API de PayDunya (`checkout-invoice/create`).
4. PayDunya répond avec un **lien de paiement URL** (ex: `https://paydunya.com/sandbox-checkout/invoice/...`).
5. Le serveur renvoie ce lien au frontend, qui redirige le client vers cette page pour payer !

---

## 📡 5. Le Webhook et la Redistribution (Route `/webhook`)

C'est ici que la magie opère. Un "Webhook" est une URL de notre serveur que PayDunya va appeler *secrètement en arrière-plan* dès qu'un client réussit son paiement.

**Fichier :** `server/routes/payment.js` (Route `POST /webhook`)

1. **Confirmation :** PayDunya contacte notre route `/webhook` en disant *"La commande n°123 a été payée !"*.
2. **Mise à jour de la commande :** Le serveur se connecte à Supabase avec ses droits d'admin (`SERVICE_ROLE_KEY`) et passe le statut de la commande à `PREPARING`.
3. **Le Split Payment (Payout) :**
   - Le serveur recherche les infos du marchand dans Supabase.
   - Il calcule les montants : `Total * 0.05` (votre commission) et `Total * 0.95` (la part du marchand).
   - Il lance un appel vers l'API **Direct Pay** de PayDunya (`/direct-pay/credit-account`).
   - PayDunya reçoit l'ordre et transfère instantanément les 95% vers le numéro Wave/Orange Money du vendeur.

---

## 🛠️ En résumé pour la prochaine fois

Si vous devez refaire cela sur un autre projet, voici les étapes clés à suivre :
1. **Créer un backend sécurisé** pour cacher les clés (Node.js, Python, etc.).
2. **Créer une route d'initialisation** qui contacte l'API PayDunya pour obtenir l'URL de paiement et rediriger le client.
3. **Créer une route Webhook** qui attend le "Ping" de PayDunya.
4. (Optionnel) **Utiliser l'API Direct Pay** de PayDunya dans le webhook pour répartir l'argent automatiquement si c'est une Marketplace.

**Fin du guide !** Vous êtes maintenant un pro de l'intégration e-commerce ! 🚀
