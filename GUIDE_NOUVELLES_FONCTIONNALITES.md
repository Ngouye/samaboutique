# Guide : les 3 nouvelles fonctionnalités de SamaBoutik

1. **Notifications WhatsApp automatiques** : le marchand et le client sont prévenus à chaque étape d'une commande.
2. **« Boutiques près de moi »** : un annuaire public avec une carte, à l'adresse `/boutiques`.
3. **Suivi du livreur en direct** : le client voit le livreur avancer sur une carte, avec l'heure d'arrivée estimée.

---

## 1. Mise en route (dans cet ordre)

### Étape 1 — La base de données
Dans Supabase, ouvrez **SQL Editor** et exécutez `new_features.sql`. Les scripts `security_fixes.sql`, `security_fixes_2.sql` et `admin_locations.sql` doivent déjà avoir été exécutés.

> Si vous relancez un jour `admin_locations.sql`, relancez ensuite `new_features.sql`.

### Étape 2 — Le serveur (dossier `server/`)
1. Ajoutez les variables ci-dessous chez votre hébergeur (Render, Railway…) ou dans `server/.env`.
2. Redéployez le serveur.

| Variable | Rôle | Obligatoire ? |
|---|---|---|
| `WHATSAPP_PROVIDER` | `meta` ou `ultramsg` (voir section 2) | Pour WhatsApp |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Si `meta` | Pour WhatsApp |
| `ULTRAMSG_INSTANCE_ID`, `ULTRAMSG_TOKEN` | Si `ultramsg` | Pour WhatsApp |
| `FRONTEND_URL` | Adresse du site (déjà utilisée) : sert aussi aux liens envoyés sur WhatsApp | Oui |

Ces clés restent **uniquement sur le serveur**. Ne les mettez jamais dans les variables Vercel du site.

Sans ces clés, les notifications WhatsApp sont simplement désactivées : le reste du site fonctionne normalement.

### Étape 3 — Le site
Redéployez le site (Vercel).

---

## 2. Notifications WhatsApp

### Messages envoyés

| Moment | Destinataire | Contenu |
|---|---|---|
| Nouvelle commande (paiement à la livraison) ou paiement Wave / OM confirmé | Marchand | Client, téléphone, adresse, articles, total |
| Même moment | Client | Confirmation, total, **code de livraison**, lien de suivi |
| Le livreur accepte la course | Client | Nom et numéro du livreur, lien pour le suivre en direct |
| Commande livrée | Client | Remerciement et lien vers la boutique |
| Commande annulée | Client | Information et numéro de la boutique |

Chaque marchand peut couper ses alertes ou celles de ses clients dans **Paramètres → Notifications WhatsApp**. Il y voit aussi l'historique de ses derniers messages.

### Fonctionnement
- La base place chaque message dans une file d'attente (table `notification_outbox`), puis le serveur l'envoie dans les secondes qui suivent.
- En cas d'échec, le serveur réessaie jusqu'à 5 fois (après 1, 5, 15 puis 60 minutes).
- Un message non envoyé au bout de 12 heures est abandonné.
- Un même numéro client ne reçoit pas plus de 6 messages par heure. Cela évite qu'un inconnu utilise la boutique pour harceler quelqu'un.
- Une panne de WhatsApp ne bloque **jamais** une commande.

### Option A — API officielle de Meta (recommandée)
C'est la solution officielle : aucun risque de blocage du numéro.

1. Créez un compte sur business.facebook.com, puis une application WhatsApp sur developers.facebook.com.
2. Ajoutez un numéro dédié à SamaBoutik. Récupérez son **Phone number ID** et un **jeton permanent** (utilisateur système).
3. Créez les 5 modèles ci-dessous dans WhatsApp Manager (catégorie **Utilitaire**, langue **Français**). Utilisez exactement les noms et l'ordre des variables indiqués, puis attendez leur validation par Meta.
4. Renseignez `WHATSAPP_PROVIDER=meta`, `WHATSAPP_TOKEN=…` et `WHATSAPP_PHONE_NUMBER_ID=…`.

**`samaboutik_nouvelle_commande`**
```
🛍️ Nouvelle commande sur {{1}} ! Réf. #{{2}}
Client : {{3}} ({{4}})
Articles : {{5}}
Total : {{6}} — {{7}}
Livraison : {{8}}
Gérez-la depuis votre tableau de bord SamaBoutik.
```

**`samaboutik_commande_confirmee`**
```
Bonjour {{1}} 👋 Votre commande #{{2}} chez {{3}} est bien reçue ✅
Total : {{4}} ({{5}})
🔐 Votre code de livraison : {{6}}. Donnez-le au livreur seulement quand vous avez reçu votre colis.
Suivre ma commande : {{7}}
Jërëjëf !
```

**`samaboutik_commande_en_route`**
```
🛵 Votre commande #{{1}} de {{2}} est en route !
Livreur : {{3}}
Suivez-le en direct : {{4}}
🔐 Préparez votre code : {{5}}. À tout de suite !
```

**`samaboutik_commande_livree`**
```
✅ Commande #{{1}} livrée ! Merci d'avoir choisi {{2}} 🙏
Donnez votre avis : {{3}}
Jërëjëf, ba beneen yoon !
```

**`samaboutik_commande_annulee`**
```
❌ Votre commande #{{1}} chez {{2}} a été annulée.
Pour toute question, contactez la boutique : {{3}}. Merci de votre compréhension.
```

Réglages facultatifs :
- `WHATSAPP_TEMPLATE_LANG` : `fr` par défaut.
- `WHATSAPP_TEMPLATE_PREFIX` : `samaboutik_` par défaut.
- `WHATSAPP_GRAPH_VERSION` : `v23.0` par défaut.

### Option B — UltraMsg (plus rapide à démarrer)
UltraMsg relie un numéro WhatsApp ordinaire au serveur par QR code. Les messages partent en texte libre, sans validation de modèles.

1. Créez une instance sur ultramsg.com et scannez le QR code avec le téléphone de SamaBoutik.
2. Renseignez `WHATSAPP_PROVIDER=ultramsg`, `ULTRAMSG_INSTANCE_ID=…` et `ULTRAMSG_TOKEN=…`.

⚠️ Ce n'est pas l'API officielle : WhatsApp peut bloquer un numéro qui envoie beaucoup de messages. Utilisez un numéro dédié et passez à Meta quand le volume grandit.

---

## 3. Annuaire « Boutiques près de moi »

- **Page publique** : `/boutiques`, avec un lien « Boutiques » dans le menu de la page d'accueil.
- **Recherche** : par nom, catégorie ou ville. Le bouton **« Autour de moi »** classe les boutiques de la plus proche à la plus éloignée.
- **Quelles boutiques apparaissent** : seules celles qui l'ont **accepté**, qui sont localisées, qui ont au moins un produit et qui ne sont pas suspendues. On ne montre ni le numéro de téléphone ni les informations de paiement.
- **Comment une boutique s'inscrit** :
  - à l'inscription, une case cochée par défaut apparaît dès que la boutique est localisée ;
  - plus tard, dans **Paramètres → Localisation → « Apparaître dans Boutiques près de moi »**.
  - Les boutiques déjà existantes n'y figurent pas tant que leur marchand ne l'a pas activé.
- **Argument de vente** : les boutiques **Pro et Premium** apparaissent « À la une », en premier, avec une couronne.

---

## 4. Suivi du livreur en direct

1. **Côté livreur** : dès qu'il accepte une course, sa page affiche « Le client vous suit en direct ».
   - La position est envoyée toutes les 8 secondes environ, ou plus tôt s'il a bougé de plus de 25 m.
   - L'écran reste allumé si le téléphone le permet.
   - **Il doit garder la page ouverte** : les navigateurs coupent le GPS en arrière-plan.
2. **Côté client** : dans « Suivre ma commande », une carte montre le livreur qui se déplace en douceur, son trajet, l'adresse de livraison (si le client a partagé sa position GPS à la commande), la distance et l'heure d'arrivée estimée. La carte se met à jour toutes les 6 secondes.
3. **Lien WhatsApp** : le lien reçu par le client ouvre directement le suivi avec son numéro déjà rempli. Il n'a plus qu'à saisir son code.
4. **Confidentialité** :
   - la position n'est visible que pendant la course ;
   - seul le livreur assigné peut l'envoyer ;
   - elle est effacée au bout de 2 jours ;
   - le marchand peut voir la position de ses propres livreurs.

---

## 5. Mots-clés des produits

Dans la fiche produit, le marchand peut ajouter des **mots-clés** (par exemple : boubou, tabaski, bazin). La recherche de la vitrine les utilise en plus du nom du produit.

---

## 6. Fichiers ajoutés ou modifiés

- **Base de données** : `new_features.sql`
- **Serveur** :
  - `server/lib/whatsapp.js`, `notificationMessages.js`, `notificationWorker.js`, `supabase.js`, `catalog.js`
  - `server/index.js`
- **Site — nouvelle page** : `src/pages/Directory.jsx`
- **Site — composants** :
  - `src/components/directory/DirectoryMap.jsx`
  - `src/components/shop/LiveDeliveryMap.jsx`
  - `src/components/driver/LiveLocationShare.jsx`
  - `src/components/dashboard/SmartSettings.jsx`, `TagsInput.jsx`
- **Site — pages modifiées** : `PublicShop.jsx`, `DriverDashboard.jsx`, `MerchantDashboard.jsx`, `Register.jsx`, `Landing.jsx`, `App.jsx`, `AuthContext.jsx`, `index.css`
