// Icône d'une catégorie de produits, d'après son nom (catégories libres des commerçants).
const RULES = [
  [/chaussure|basket|sandale|talon|botte/i, 'footsteps-outline'],
  [/v[eê]tement|habit|mode|robe|costume|boubou|wax|tissu|pagne|chemise|t-shirt/i, 'shirt-outline'],
  [/sac|accessoire|bijou|montre|lunette/i, 'watch-outline'],
  [/beaut|cosm|parfum|maquill|soin|cheveu/i, 'sparkles-outline'],
  [/t[eé]l[eé]phone|tablette|[eé]lectro|informatique|ordinateur|tech|gaming|jeu/i, 'phone-portrait-outline'],
  [/aliment|cuisine|[eé]picerie|boisson|restau|p[aâ]tisserie|march[eé]/i, 'fast-food-outline'],
  [/maison|d[eé]co|meuble|literie/i, 'home-outline'],
  [/enfant|b[eé]b[eé]|jouet/i, 'happy-outline'],
  [/sport|fitness/i, 'barbell-outline'],
  [/livre|papeterie|[eé]cole/i, 'book-outline'],
  [/sant[eé]|pharma/i, 'medkit-outline'],
  [/auto|moto|voiture/i, 'car-outline'],
];

export const categoryIcon = (name) => RULES.find(([re]) => re.test(String(name || '')))?.[1] || 'pricetag-outline';

// Couleur douce d'une catégorie (toujours la même pour un même nom) : index dans SOFT (theme.js).
export function categoryToneIndex(name) {
  const s = String(name || 'Autres');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h;
}

// Icône d'une caractéristique de produit (« Matière : Wax », « Origine : Sénégal »…).
const FEATURE_RULES = [
  [/mati[eè]re|tissu|composition/i, 'layers-outline'],
  [/couleur|teinte/i, 'color-palette-outline'],
  [/taille|pointure|dimension|longueur|largeur|hauteur/i, 'resize-outline'],
  [/marque|mod[eè]le|r[eé]f/i, 'pricetag-outline'],
  [/origine|fabriqu|provenance|pays/i, 'flag-outline'],
  [/poids|contenance|volume/i, 'scale-outline'],
  [/garantie/i, 'shield-checkmark-outline'],
  [/entretien|lavage/i, 'water-outline'],
  [/coupe|style|forme/i, 'cut-outline'],
  [/[eé]tat|neuf|occasion/i, 'ribbon-outline'],
  [/batterie|autonomie|[eé]cran|m[eé]moire|stockage/i, 'hardware-chip-outline'],
  [/parfum|odeur|senteur/i, 'flower-outline'],
];
export const featureIcon = (key) => FEATURE_RULES.find(([re]) => re.test(String(key || '')))?.[1] || 'information-circle-outline';
