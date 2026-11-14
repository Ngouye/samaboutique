// Présentation d'une boutique dans l'annuaire : sa propre description si le commerçant en a écrit une,
// sinon une phrase construite uniquement à partir de faits réels (catégories, articles, prix, lieu, avis).

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');

export function joinFr(list) {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} et ${list[list.length - 1]}`;
}

const NEW_DAYS = 30;

// Boutique ouverte depuis moins d'un mois, sans avis pour l'instant.
export function isNewShop(shop, now = Date.now()) {
  const created = Date.parse(shop?.created_at || '');
  if (!Number.isFinite(created)) return false;
  return now - created < NEW_DAYS * 864e5 && !(Number(shop?.reviews_count) > 0);
}

export function shopPlace(shop) {
  const city = String(shop?.city || '').trim();
  const address = String(shop?.address || '').trim();
  if (address && city && !address.toLowerCase().includes(city.toLowerCase())) return `${address}, ${city}`;
  return address || city || 'Sénégal';
}

export function shopSummary(shop) {
  const own = String(shop?.description || '').replace(/\s+/g, ' ').trim();
  if (own.length >= 12) return { text: own, generated: false };

  const city = String(shop?.city || '').trim();
  const where = !city || city === 'Sénégal' ? 'au Sénégal' : `à ${city}`;
  const cats = [...new Set((shop?.categories || []).map((c) => String(c || '').trim()).filter(Boolean))]
    .slice(0, 3)
    .map((c) => c.toLocaleLowerCase('fr-FR'));

  const parts = [`Boutique en ligne ${where}${cats.length ? ` : ${joinFr(cats)}` : ''}.`];

  const count = Number(shop?.products_count) || 0;
  if (count > 0) {
    const min = Number(shop?.min_price_fcfa) || 0;
    parts.push(`${count} article${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}${min > 0 ? `, à partir de ${fmt(min)} FCFA` : ''}.`);
  }

  const reviews = Number(shop?.reviews_count) || 0;
  const rating = Number(shop?.rating) || 0;
  if (reviews > 0 && rating > 0) {
    parts.push(`Noté ${rating.toFixed(1).replace('.', ',')}/5 par ${reviews} client${reviews > 1 ? 's' : ''}.`);
  }

  parts.push(shop?.whatsapp ? 'Commandez sur sa vitrine ou écrivez-lui sur WhatsApp.' : 'Commandez directement sur sa vitrine.');
  return { text: parts.join(' '), generated: true };
}
