// Itinéraire par la route, avec les étapes en français (« Tournez à droite dans Rue 14 »).
// Service : Valhalla, serveur public d'OpenStreetMap (FOSSGIS), gratuit et sans clé. Il est partagé :
// on ne redemande un itinéraire que si le livreur a bougé d'au moins 120 m ou après une minute.
// En cas d'échec (réseau, service indisponible), l'appelant garde la ligne droite et l'estimation.
import { useEffect, useRef, useState } from 'react';

const ENDPOINT = 'https://valhalla1.openstreetmap.de/route';

// Tracé encodé (format « polyline » de Google, précision 6 chez Valhalla) → [[lat, lng], …]
export function decodePolyline(str, precision = 6) {
  const factor = 10 ** precision;
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < str.length) {
    for (let which = 0; which < 2; which += 1) {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = str.charCodeAt(index) - 63;
        index += 1;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < str.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta; else lng += delta;
    }
    points.push([lat / factor, lng / factor]);
  }
  return points;
}

// Distance en mètres entre deux points [lat, lng].
export function metersBetween(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Icône d'une étape selon le type de manœuvre de Valhalla.
export function stepKind(type) {
  if ([1, 2, 3].includes(type)) return 'start';
  if ([4, 5, 6].includes(type)) return 'arrive';
  if ([9, 18, 20, 23].includes(type)) return 'slight-right';
  if ([10, 11].includes(type)) return 'right';
  if ([16, 19, 21, 24].includes(type)) return 'slight-left';
  if ([14, 15].includes(type)) return 'left';
  if ([12, 13].includes(type)) return 'u-turn';
  if ([26, 27].includes(type)) return 'roundabout';
  return 'straight';
}

// Réponse de Valhalla → { coords, km, minutes, steps: [{ text, street, km, kind }] }
export function parseRoute(data) {
  const trip = data?.trip;
  const leg = trip?.legs?.[0];
  if (!leg?.shape) return null;
  return {
    coords: decodePolyline(leg.shape),
    km: Number(trip.summary?.length) || 0,
    minutes: Math.max(1, Math.round((Number(trip.summary?.time) || 0) / 60)),
    steps: (leg.maneuvers || []).map((m) => ({
      text: m.instruction || '',
      street: (m.street_names || [])[0] || '',
      km: Number(m.length) || 0,
      kind: stepKind(m.type),
    })),
  };
}

const cache = new Map();
// from, to : [lat, lng]. costing « motor_scooter » : itinéraire adapté aux scooters des livreurs.
export async function fetchRoute(from, to, { costing = 'motor_scooter' } = {}) {
  const key = `${from.map((v) => v.toFixed(4)).join(',')}>${to.map((v) => v.toFixed(4)).join(',')}>${costing}`;
  if (cache.has(key)) return cache.get(key);
  const body = {
    locations: [{ lat: from[0], lon: from[1] }, { lat: to[0], lon: to[1] }],
    costing,
    directions_options: { language: 'fr-FR', units: 'kilometers' },
  };
  const res = await fetch(`${ENDPOINT}?json=${encodeURIComponent(JSON.stringify(body))}`);
  if (!res.ok) throw new Error('Itinéraire indisponible');
  const route = parseRoute(await res.json());
  if (!route) throw new Error('Itinéraire introuvable');
  if (cache.size > 30) cache.delete(cache.keys().next().value);
  cache.set(key, route);
  return route;
}

// Itinéraire à jour entre deux points [lat, lng] (null tant qu'il n'est pas prêt ou s'il échoue).
export function useRoute(from, to, { minMoveM = 120, maxAgeMs = 60000 } = {}) {
  const [route, setRoute] = useState(null);
  const [failed, setFailed] = useState(false);
  const last = useRef(null);
  const seq = useRef(0); // numéro de la dernière demande : seule sa réponse est gardée
  const mounted = useRef(true);
  const fromLat = from?.[0];
  const fromLng = from?.[1];
  const toLat = to?.[0];
  const toLng = to?.[1];

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (fromLat == null || fromLng == null || toLat == null || toLng == null) return;
    const start = [fromLat, fromLng];
    const end = [toLat, toLng];
    const toKey = end.map((v) => v.toFixed(5)).join(',');
    const prev = last.current;
    if (prev && prev.toKey === toKey && metersBetween(prev.from, start) < minMoveM && Date.now() - prev.at < maxAgeMs) return;
    last.current = { from: start, at: Date.now(), toKey };
    seq.current += 1;
    const mine = seq.current;
    const latest = () => mounted.current && mine === seq.current;
    fetchRoute(start, end)
      .then((r) => { if (latest()) { setRoute(r); setFailed(false); } })
      .catch(() => { if (latest()) setFailed(true); });
  }, [fromLat, fromLng, toLat, toLng, minMoveM, maxAgeMs]);

  return { route, failed };
}
