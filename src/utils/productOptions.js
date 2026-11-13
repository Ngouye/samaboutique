// Options et caractéristiques d'un produit, à partir de la colonne « variants ».
//  - { sizes: [...], colors: [...] } : tailles et couleurs à choisir (ancien format) ;
//  - ["Matière: Wax", "Couleur: Bleu"] : caractéristiques saisies dans le tableau de bord (informations, pas des choix) ;
//  - ["S", "M", "L"] : ancienne liste simple d'options à choisir.
export function productOptions(product) {
  const v = product?.variants;
  if (Array.isArray(v)) {
    const strings = v.filter((x) => typeof x === 'string' && x.trim());
    return {
      sizes: strings.filter((x) => !x.includes(':')),
      colors: [],
      features: strings
        .filter((x) => x.includes(':'))
        .map((x) => [x.slice(0, x.indexOf(':')).trim(), x.slice(x.indexOf(':') + 1).trim()])
        .filter(([k, val]) => k && val),
      legacyList: true,
    };
  }
  const isObj = v && typeof v === 'object';
  return {
    sizes: isObj && Array.isArray(v.sizes) ? v.sizes.filter(Boolean) : [],
    colors: isObj && Array.isArray(v.colors) ? v.colors.filter(Boolean) : [],
    features: [],
    legacyList: false,
  };
}

// Le client doit-il choisir une taille, une couleur ou une option avant d'ajouter au panier ?
export const needsChoice = (product) => {
  const o = productOptions(product);
  return o.sizes.length > 0 || o.colors.length > 0;
};
