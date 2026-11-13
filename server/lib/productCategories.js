// Catégories de produits et caractéristiques de chacune : mêmes valeurs que src/utils/categories.js
// (le serveur est déployé seul, sans le dossier du site). Un test vérifie qu'elles restent identiques.
export const CATEGORY_FEATURES = {
  'Vêtements': ['Taille', 'Couleur', 'Matière', 'Genre'],
  'Chaussures': ['Pointure', 'Couleur', 'Matière', 'Genre'],
  'Téléphones & Tablettes': ['Capacité de Stockage', 'RAM', 'Couleur', 'Taille Écran', 'Réseau (4G/5G)'],
  'Ordinateurs': ['Processeur', 'RAM', 'Stockage (SSD/HDD)', 'Taille Écran', 'Carte Graphique'],
  'Accessoires': ['Type', 'Couleur', 'Compatibilité'],
  'Montres & Bijoux': ['Matière', 'Couleur', 'Genre'],
  'Électroménager': ['Marque', 'Couleur', 'Puissance (Watts)'],
  'Beauté & Santé': ['Type de Peau/Cheveux', 'Contenance (ml)', 'Parfum'],
  'Autres': ['Détails'],
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_FEATURES);
