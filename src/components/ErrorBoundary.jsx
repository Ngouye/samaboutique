import React from 'react';
import { WifiOff, TriangleAlert } from 'lucide-react';
import { captureError } from '../lib/monitoring';
import { isOffline } from '../utils/networkErrors';

const RELOAD_KEY = 'samaboutik-chunk-reload-at';

// Fichier du site introuvable : en général, une nouvelle version vient d'être mise en ligne.
const isChunkError = (error) =>
  error?.name === 'ChunkLoadError' ||
  /Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically|Unable to preload CSS/i.test(error?.message || '');

// Un seul rechargement automatique par minute : jamais de boucle si le fichier reste introuvable.
function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, reference: null, offline: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (isChunkError(error)) {
      if (isOffline()) { this.setState({ offline: true }); return; }
      if (reloadOnce()) return;
    }
    const reference = captureError(error, { extra: { componentStack: errorInfo?.componentStack } });
    this.setState({ reference });
    if (import.meta.env.DEV) console.error('ErrorBoundary :', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const { offline, reference, error } = this.state;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] p-6" role="alert">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)]">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20" aria-hidden="true">
            {offline ? <WifiOff className="h-7 w-7" /> : <TriangleAlert className="h-7 w-7" />}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0b1f17]">
            {offline ? 'Pas de connexion internet' : 'Un problème est survenu'}
          </h1>
          <p className="mt-3 text-slate-600">
            {offline
              ? 'Cette page n’a pas pu se charger. Vérifiez votre connexion, puis réessayez.'
              : 'Cette page a rencontré une erreur inattendue. Rechargez-la : vos commandes et vos données ne sont pas perdues.'}
          </p>
          {reference && !offline && (
            <p className="mt-4 text-sm text-slate-500">
              Référence à communiquer au support : <span className="font-mono font-bold text-slate-800">{reference}</span>
            </p>
          )}
          {import.meta.env.DEV && error && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-red-50 p-3 text-left text-xs text-red-700">{String(error?.stack || error)}</pre>
          )}
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-full bg-[#0b1f17] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-800"
            >
              {offline ? 'Réessayer' : 'Recharger la page'}
            </button>
            <a href="/" className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 transition-colors hover:border-slate-400">
              Retour à l’accueil
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
