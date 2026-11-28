// Mon espace : profil (nom, téléphone) et adresses de livraison, enregistrés sur ce téléphone uniquement.
// Le formulaire de commande s'en sert pour se remplir tout seul.
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { store } from './storage';

const ADDRESSES = 'addresses';
const MAX_ADDRESSES = 10;

// Types d'adresse proposés (libellé, icône).
export const ADDRESS_LABELS = [['Maison', 'home'], ['Bureau', 'briefcase'], ['Autre', 'location']];
export const addressIcon = (label) => (ADDRESS_LABELS.find(([l]) => l === label) || ADDRESS_LABELS[2])[1];

// Profil : mêmes valeurs que le formulaire de commande (clé « client »).
export function getProfile() {
  const c = store.get('client', {});
  return { name: c.name || '', phone: c.phone || '' };
}
export function saveProfile({ name, phone }) {
  store.set('client', { ...store.get('client', {}), name: String(name || '').trim(), phone: String(phone || '').trim() });
}

export const listAddresses = () => store.get(ADDRESSES, []);
export const defaultAddress = () => {
  const all = listAddresses();
  return all.find((a) => a.isDefault) || all[0] || null;
};

// Ajoute ou modifie une adresse ; la première enregistrée devient l'adresse principale.
export function saveAddress(entry) {
  const all = listAddresses();
  const id = entry.id || `a${Date.now().toString(36)}`;
  const next = { id, label: entry.label || 'Autre', address: String(entry.address || '').trim().slice(0, 300), gps: entry.gps || null };
  let list = all.some((a) => a.id === id) ? all.map((a) => (a.id === id ? { ...a, ...next } : a)) : [...all, next];
  if (entry.isDefault || list.length === 1) list = list.map((a) => ({ ...a, isDefault: a.id === id }));
  store.set(ADDRESSES, list.slice(-MAX_ADDRESSES));
  return next;
}

export function removeAddress(id) {
  let list = listAddresses().filter((a) => a.id !== id);
  if (list.length && !list.some((a) => a.isDefault)) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
  store.set(ADDRESSES, list);
}

export function setDefaultAddress(id) {
  store.set(ADDRESSES, listAddresses().map((a) => ({ ...a, isDefault: a.id === id })));
}

// Position du téléphone : { gps: { lat, lng }, text }. « text » est une adresse approximative
// (iPhone et Android seulement) ; la position GPS suffit au livreur pour trouver le chemin.
export async function locateMe() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Autorisez la localisation pour utiliser votre position.');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const gps = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) };
  let text = '';
  if (Platform.OS !== 'web') {
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: gps.lat, longitude: gps.lng });
      if (place) {
        const parts = [place.name, place.street, place.district || place.subregion, place.city].filter(Boolean);
        text = parts.filter((v, i) => parts.indexOf(v) === i).join(', ');
      }
    } catch { /* adresse approximative indisponible : la position GPS suffit */ }
  }
  return { gps, text };
}

// Adresse envoyée avec la commande, au même format que la vitrine du site :
// « Médina, rue 11 || GPS: https://www.google.com/maps/search/?api=1&query=14.69,-17.44 ».
// La boutique et le livreur y retrouvent l'itinéraire exact.
export function addressWithGps(address, gps) {
  const text = String(address || '').trim().slice(0, 480);
  if (!gps || !Number.isFinite(gps.lat) || !Number.isFinite(gps.lng)) return text;
  return `${text} || GPS: https://www.google.com/maps/search/?api=1&query=${gps.lat},${gps.lng}`;
}
