import React, { lazy } from 'react';

export const lazyWithRetry = (componentImport) => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      // Hors ligne, recharger n'afficherait que la page d'erreur du navigateur :
      // on laisse l'écran « Pas de connexion internet » proposer de réessayer.
      if (!pageHasAlreadyBeenForceRefreshed && navigator.onLine !== false) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
};
