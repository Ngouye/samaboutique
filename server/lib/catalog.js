// Montant en francs CFA pour les messages : 15000 → « 15 000 F ».
export const formatFcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0))} F`;
