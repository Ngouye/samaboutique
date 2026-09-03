import { Shirt, Footprints, Smartphone, Laptop, Headphones, Watch, Tv, HeartPulse, MoreHorizontal } from 'lucide-react';

export const SHOP_CATEGORIES = [
  { id: 'vetements', name: 'Vêtements', icon: Shirt, color: 'from-pink-500 to-rose-500' },
  { id: 'chaussures', name: 'Chaussures', icon: Footprints, color: 'from-orange-500 to-amber-500' },
  { id: 'telephones', name: 'Téléphones & Tablettes', icon: Smartphone, color: 'from-blue-500 to-cyan-500' },
  { id: 'ordinateurs', name: 'Ordinateurs', icon: Laptop, color: 'from-indigo-500 to-blue-600' },
  { id: 'accessoires', name: 'Accessoires', icon: Headphones, color: 'from-purple-500 to-fuchsia-500' },
  { id: 'montres', name: 'Montres & Bijoux', icon: Watch, color: 'from-emerald-500 to-teal-500' },
  { id: 'electromenager', name: 'Électroménager', icon: Tv, color: 'from-slate-500 to-gray-600' },
  { id: 'beaute', name: 'Beauté & Santé', icon: HeartPulse, color: 'from-rose-400 to-pink-600' },
  { id: 'autre', name: 'Autres', icon: MoreHorizontal, color: 'from-gray-400 to-gray-500' }
];

export const getCategoryByName = (name) => {
  return SHOP_CATEGORIES.find(c => c.name === name) || SHOP_CATEGORIES.find(c => c.id === 'autre');
};

export const CATEGORY_FEATURES = {
  'Vêtements': ['Taille', 'Couleur', 'Matière', 'Genre'],
  'Chaussures': ['Pointure', 'Couleur', 'Matière', 'Genre'],
  'Téléphones & Tablettes': ['Capacité de Stockage', 'RAM', 'Couleur', 'Taille Écran', 'Réseau (4G/5G)'],
  'Ordinateurs': ['Processeur', 'RAM', 'Stockage (SSD/HDD)', 'Taille Écran', 'Carte Graphique'],
  'Accessoires': ['Type', 'Couleur', 'Compatibilité'],
  'Montres & Bijoux': ['Matière', 'Couleur', 'Genre'],
  'Électroménager': ['Marque', 'Couleur', 'Puissance (Watts)'],
  'Beauté & Santé': ['Type de Peau/Cheveux', 'Contenance (ml)', 'Parfum'],
  'Autres': ['Détails']
};

