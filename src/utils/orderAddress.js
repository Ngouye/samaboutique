// Adresse de livraison saisie par le client, avec sa position GPS facultative.
// La vitrine l'enregistre ainsi : « Médina, rue 11 || GPS: https://www.google.com/maps/search/?api=1&query=14.69,-17.44 ».
// Le texte vient du client : le lien de carte est toujours reconstruit à partir des seules
// coordonnées, jamais ouvert tel quel (un faux lien pourrait mener n'importe où).
import { googleMapsUrl } from './geolocation';

const GPS_SEPARATOR = /\s*\|\|\s*GPS:\s*/;
const COORDS = /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/;

export function parseOrderAddress(raw) {
  const [address = '', gpsPart = ''] = String(raw || '').split(GPS_SEPARATOR);
  const match = gpsPart.match(COORDS);
  let coords = null;
  if (match) {
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) coords = { lat, lng };
  }
  return { address: address.trim(), coords };
}

// Itinéraire : position GPS exacte si le client l'a partagée, sinon recherche de l'adresse et de la zone.
export function orderMapsUrl(order) {
  const { address, coords } = parseOrderAddress(order?.customer_address);
  if (coords) return googleMapsUrl(coords.lat, coords.lng);
  const query = [address, order?.delivery_zone].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
