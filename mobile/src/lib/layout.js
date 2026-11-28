// Affichage des produits choisi par le client : grille (2 colonnes) ou liste (1 colonne, plus de détails).
// Retenu sur ce téléphone, pour Explorer comme pour les boutiques.
import { useCallback, useState } from 'react';
import { store } from './storage';

const KEY = 'productLayout';

export function useProductLayout() {
  const [layout, setLayoutState] = useState(() => (store.get(KEY, 'grid') === 'list' ? 'list' : 'grid'));
  const setLayout = useCallback((next) => {
    setLayoutState(next);
    store.set(KEY, next);
  }, []);
  return [layout, setLayout];
}
