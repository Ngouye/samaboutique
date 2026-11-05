// Messages clairs quand le réseau ou le serveur ne répond pas.

export const NETWORK_MESSAGE = 'Connexion internet perdue. Vérifiez votre réseau, puis réessayez.';
export const SERVER_DOWN_MESSAGE = 'Le service est momentanément indisponible. Réessayez dans quelques instants.';

const NETWORK_PATTERN = /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected|err_network|fetch failed|timeout|timed out/i;
// Messages techniques (base de données, jetons…) qu'il ne faut pas montrer tels quels.
const TECHNICAL_PATTERN = /violates|syntax error|column |relation |jwt|pgrst|null value|invalid input|unexpected token|is not valid json|undefined|cannot read|permission denied|function .* does not exist/i;

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

export function isNetworkError(error) {
  if (isOffline()) return true;
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  const message = String(error.message || error.error_description || error || '');
  return NETWORK_PATTERN.test(message) || error.status === 0;
}

// Texte à afficher à l'utilisateur pour une erreur : coupure réseau, message métier lisible, ou repli.
export function friendlyError(error, fallback = 'Une erreur est survenue. Réessayez dans un instant.') {
  if (isNetworkError(error)) return NETWORK_MESSAGE;
  const message = typeof error === 'string' ? error : error?.message;
  if (!message || TECHNICAL_PATTERN.test(message) || message.length > 220) return fallback;
  return message;
}
