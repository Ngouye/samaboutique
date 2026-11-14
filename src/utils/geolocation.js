// Position GPS de l'appareil, demandée uniquement après un clic de l'utilisateur.
// L'erreur porte une raison (`reason`) pour que chaque page affiche le bon conseil :
// 'unsupported' | 'denied' | 'unavailable' | 'timeout'.
function locationError(message, reason) {
  const err = new Error(message);
  err.reason = reason;
  return err;
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(locationError("Votre navigateur ne permet pas la géolocalisation.", 'unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(
        err.code === 1
          ? locationError("Autorisation refusée : le navigateur bloque l'accès à votre position.", 'denied')
          : err.code === 3
            ? locationError("La recherche de position a pris trop de temps. Réessayez, idéalement près d'une fenêtre.", 'timeout')
            : locationError("Position introuvable. Réessayez dans quelques instants, idéalement près d'une fenêtre.", 'unavailable')
      ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export const googleMapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

const valid = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng)
  && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  && !(lat === 0 && lng === 0);

const round = (n) => Math.round(n * 1e6) / 1e6;

// Lit une position collée par le commerçant : « 14.69282, -17.44670 », un lien Google Maps
// (…/@14.69,-17.44,17z, …!3d14.69!4d-17.44, ?q=14.69,-17.44) ou des degrés
// « 14°41'34.2"N 17°26'48.1"W ». Renvoie { lat, lng } ou null.
export function parseCoordinates(input) {
  const text = String(input || '').trim();
  if (!text) return null;
  const pick = (lat, lng) => (valid(lat, lng) ? { lat: round(lat), lng: round(lng) } : null);

  // Lien Google Maps vers un lieu : !3d<lat>!4d<lng> = le point exact (prioritaire sur le centre de la carte)
  let m = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) return pick(Number(m[1]), Number(m[2]));

  // Degrés, minutes, secondes
  m = text.match(/(\d+)\s*°\s*(\d+)\s*['′]\s*([\d.]+)\s*(?:"|″|'')?\s*([NS])[\s,]+(\d+)\s*°\s*(\d+)\s*['′]\s*([\d.]+)\s*(?:"|″|'')?\s*([EWO])/i);
  if (m) {
    const lat = (Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600) * (/s/i.test(m[4]) ? -1 : 1);
    const lng = (Number(m[5]) + Number(m[6]) / 60 + Number(m[7]) / 3600) * (/[wo]/i.test(m[8]) ? -1 : 1);
    return pick(lat, lng);
  }

  // Deux nombres décimaux avec un point : « 14.69282, -17.44670 », « @14.69,-17.44 », « q=14.69,-17.44 »
  m = text.match(/(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/);
  if (m) return pick(Number(m[1]), Number(m[2]));

  // Virgule décimale à la française : « 14,69282 ; -17,44670 » ou « 14,69282 -17,44670 »
  m = text.match(/(-?\d{1,2},\d+)\s*[;\s]\s*(-?\d{1,3},\d+)/);
  if (m) return pick(Number(m[1].replace(',', '.')), Number(m[2].replace(',', '.')));

  return null;
}

// Lien court Google Maps (maps.app.goo.gl, goo.gl/maps) : il ne contient pas la position.
export const isShortMapsLink = (input) => /(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(String(input || ''));
