// Déconnexion : l'écran d'au revoir est affiché au-dessus de toute l'application (FarewellHost),
// pour rester visible pendant que la page protégée laisse place à la page de connexion.
let listener = null;

export const showFarewell = (info) => listener?.(info);
export function onFarewell(fn) {
  listener = fn;
  return () => { if (listener === fn) listener = null; };
}

// Message affiché une fois sur la page de connexion (« Vous êtes déconnecté »).
const FLAG = 'samaboutik_logged_out';
export function markLoggedOut(info) {
  try { sessionStorage.setItem(FLAG, JSON.stringify(info || {})); } catch { /* stockage bloqué */ }
}
export function peekLoggedOut() {
  try { const v = sessionStorage.getItem(FLAG); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function clearLoggedOut() {
  try { sessionStorage.removeItem(FLAG); } catch { /* stockage bloqué */ }
}
