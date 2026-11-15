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
