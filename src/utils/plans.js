// Ce que chaque forfait débloque réellement, affiché à l'identique sur l'accueil et dans Facturation.
// Limites appliquées dans MerchantDashboard.jsx (produits, livreurs) ; mise en avant « À la une »
// dans l'annuaire : fonction public_shops_directory (forfaits Pro et Premium actifs).
// N'ajoutez ici une ligne que si la fonction existe vraiment.
export const PLAN_FEATURES = {
  debutant: [
    "Jusqu'à 10 produits",
    '1 livreur',
    'Les 6 thèmes de vitrine',
    'Paiement à la livraison et mobile money',
    'Notifications WhatsApp',
  ],
  pro: [
    'Tout le forfait Débutant',
    'Produits illimités',
    "Jusqu'à 5 livreurs",
    'Mise en avant « À la une » dans l’annuaire',
  ],
  premium: [
    'Tout le forfait Pro',
    'Livreurs illimités',
    'Support prioritaire',
  ],
};
