// Historique d'une commande vu par le client (fonction track_order_history de livraisons_suivi.sql) :
// phrases à afficher, et bandeau quand le livreur cherche à joindre le client ou quand il change.
// Partagé avec l'application mobile (mobile/src/lib/shared.js).

const NOTICE_MAX_AGE_MS = 3 * 60 * 60 * 1000; // un appel du livreur de plus de 3 h n'est plus d'actualité

// Liste des étapes à afficher, de la plus ancienne à la plus récente : { key, kind, label, at }.
// Une commande remise en préparation par la boutique après le départ d'un livreur devient « changement de livreur ».
export function customerTimeline(events = []) {
  const out = [];
  let accepted = false;
  let driverLeft = false; // un livreur avait pris la course
  (Array.isArray(events) ? events : []).forEach((e, i) => {
    let kind = e?.kind;
    if (kind === 'accepted' && accepted) kind = driverLeft ? 'driver_changed' : 'preparing_again';
    if (kind === 'accepted') accepted = true;
    if (kind === 'driver_taken' || kind === 'in_transit') driverLeft = true;
    if (kind === 'driver_changed') driverLeft = false;
    const label = stepLabel(kind, e?.name);
    if (!label) return;
    // Pas deux fois de suite la même étape (ex. : deux signalements « client injoignable ») : on garde l'heure la plus récente.
    const previous = out[out.length - 1];
    if (previous && previous.kind === kind && kind !== 'driver_taken') {
      previous.at = e?.at || previous.at;
      return;
    }
    out.push({ key: `${i}-${kind}`, kind, label, at: e?.at || null });
  });
  return out;
}

export function stepLabel(kind, name) {
  switch (kind) {
    case 'created': return 'Commande passée';
    case 'deposit_paid': return 'Acompte payé';
    case 'paid': return 'Paiement reçu';
    case 'accepted': return 'Commande acceptée par la boutique';
    case 'preparing_again': return 'De nouveau en préparation';
    case 'driver_taken': return `${String(name || '').trim() || 'Le livreur'} a pris votre colis`;
    case 'in_transit': return 'Votre colis est en route';
    case 'driver_calling': return 'Votre livreur a essayé de vous joindre';
    case 'driver_lost': return 'Votre livreur a cherché votre adresse';
    case 'driver_changed': return 'Changement de livreur';
    case 'delivered': return 'Commande livrée';
    case 'cancelled': return 'Commande annulée';
    case 'disputed': return 'Commande en litige';
    default: return null;
  }
}

// Bandeau à afficher en haut du suivi, ou null.
//  - en livraison : le livreur signale qu'il n'arrive pas à joindre le client, ou qu'il ne trouve pas l'adresse ;
//  - de retour en préparation après le départ d'un livreur : changement de livreur.
export function trackingNotice(order, events = [], now = Date.now()) {
  const steps = customerTimeline(events);
  const status = order?.status;
  if (status === 'IN_TRANSIT') {
    const last = [...steps].reverse().find((s) => ['driver_taken', 'in_transit', 'driver_calling', 'driver_lost'].includes(s.kind));
    if (!last || !['driver_calling', 'driver_lost'].includes(last.kind)) return null;
    const at = Date.parse(last.at || '');
    if (Number.isFinite(at) && now - at > NOTICE_MAX_AGE_MS) return null;
    return last.kind === 'driver_calling'
      ? { kind: 'driver_calling', tone: 'red', title: 'Votre livreur essaie de vous joindre', text: 'Il n’arrive pas à vous joindre. Appelez-le maintenant pour recevoir votre colis.', call: true, at: last.at }
      : { kind: 'driver_lost', tone: 'gold', title: 'Votre livreur cherche votre adresse', text: 'Appelez-le pour le guider jusqu’à vous.', call: true, at: last.at };
  }
  if (status === 'PREPARING' || status === 'PENDING') {
    const last = steps[steps.length - 1];
    if (last?.kind !== 'driver_changed') return null;
    return { kind: 'driver_changed', tone: 'gold', title: 'Changement de livreur', text: 'La boutique vous attribue un nouveau livreur. Votre code secret reste le même.', call: false, at: last.at };
  }
  return null;
}
