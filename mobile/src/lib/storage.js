// Mémoire du téléphone (panier, coordonnées, commandes passées) : localStorage d'Expo (expo-sqlite).
// Tout reste sur l'appareil ; rien n'est envoyé ailleurs.
import 'expo-sqlite/localStorage/install';

const prefix = (key) => `samaboutik:${key}`;

export const store = {
  get(key, fallback) {
    try {
      const raw = globalThis.localStorage?.getItem(prefix(key));
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { globalThis.localStorage?.setItem(prefix(key), JSON.stringify(value)); } catch { /* mémoire pleine ou indisponible */ }
  },
  remove(key) {
    try { globalThis.localStorage?.removeItem(prefix(key)); } catch { /* rien à faire */ }
  },
};
