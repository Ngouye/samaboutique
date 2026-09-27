// Zones par défaut, identiques à celles de la vitrine (src/pages/PublicShop.jsx)
// et du trigger SQL (security_fixes.sql). Utilisées quand le marchand n'a rien configuré.
export const DEFAULT_DELIVERY_ZONES = [
  { name: 'Dakar Plateau / Médina', price: 1000, active: true },
  { name: 'Almadies / Ngor / Ouakam', price: 1500, active: true },
  { name: 'Mermoz / Sacré-Cœur / Point E', price: 1500, active: true },
  { name: 'Yoff / Parcelles Assainies', price: 2000, active: true },
  { name: 'Pikine / Guédiawaye', price: 2500, active: true },
  { name: 'Rufisque / Keur Massar / Diamniadio', price: 3000, active: true },
];
