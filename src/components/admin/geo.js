// Principales villes du Sénégal (coordonnées approximatives du centre-ville).
// Sert à rattacher chaque boutique à la ville la plus proche, sans service externe.
export const SENEGAL_CITIES = [
  { name: 'Dakar', lat: 14.6928, lng: -17.4467 },
  { name: 'Pikine', lat: 14.7549, lng: -17.3903 },
  { name: 'Guédiawaye', lat: 14.7833, lng: -17.4 },
  { name: 'Rufisque', lat: 14.7153, lng: -17.2733 },
  { name: 'Thiès', lat: 14.791, lng: -16.9359 },
  { name: 'Mbour', lat: 14.42, lng: -16.97 },
  { name: 'Saint-Louis', lat: 16.0326, lng: -16.4818 },
  { name: 'Touba', lat: 14.85, lng: -15.8833 },
  { name: 'Diourbel', lat: 14.655, lng: -16.2314 },
  { name: 'Kaolack', lat: 14.152, lng: -16.0726 },
  { name: 'Fatick', lat: 14.339, lng: -16.411 },
  { name: 'Kaffrine', lat: 14.1059, lng: -15.5508 },
  { name: 'Louga', lat: 15.6144, lng: -16.2244 },
  { name: 'Matam', lat: 15.6559, lng: -13.2554 },
  { name: 'Tambacounda', lat: 13.7707, lng: -13.6673 },
  { name: 'Kédougou', lat: 12.5556, lng: -12.1743 },
  { name: 'Kolda', lat: 12.8983, lng: -14.9412 },
  { name: 'Sédhiou', lat: 12.7081, lng: -15.5569 },
  { name: 'Ziguinchor', lat: 12.5833, lng: -16.2719 },
];

export const DAKAR_CENTER = [14.7167, -17.4677];

export function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// Ville la plus proche (à moins de 60 km), sinon « Autre zone ».
export function nearestCity(lat, lng) {
  if (lat == null || lng == null) return null;
  let best = null;
  for (const city of SENEGAL_CITIES) {
    const d = distanceKm(lat, lng, city.lat, city.lng);
    if (!best || d < best.distance) best = { name: city.name, distance: d };
  }
  return best && best.distance <= 60 ? best.name : 'Autre zone';
}
