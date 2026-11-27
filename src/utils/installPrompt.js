// Installation du site comme une application (écran d'accueil du téléphone, ou fenêtre sur ordinateur).
// Le navigateur envoie son invitation (« beforeinstallprompt ») souvent avant que la page soit affichée :
// on la garde dès le démarrage, pour la proposer au clic sur « Installer l'application ».
import { useEffect } from 'react';

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export function initInstallPrompt() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // pas de bandeau automatique : le bouton du site s'en charge
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
  // Le service worker (public/sw.js) rend le site installable ; seulement sur le site en ligne.
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* installation simplement indisponible */ });
    });
  }
}

export const canPromptInstall = () => Boolean(deferred);

// Ouvre la fenêtre d'installation du système : 'accepted', 'dismissed' ou 'unavailable'.
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const event = deferred;
  deferred = null;
  notify();
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return 'unavailable';
  }
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Déjà ouverte comme une application installée ?
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
}

// 'ios' (iPhone, iPad), 'ios-other' (iPhone hors Safari), 'android' ou 'desktop'
export function installPlatform(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent, touchMac = false) {
  const ios = /iPhone|iPad|iPod/i.test(ua) || touchMac;
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) ? 'ios-other' : 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

// Choisit le fichier qui décrit l'application à installer (nom et page d'ouverture) selon l'espace :
// tableau de bord → « Ma boutique » qui s'ouvre sur /dashboard, espace livreur → « Livreur » sur /livreur.
export function useAppManifest(href) {
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link || !href) return undefined;
    const previous = link.getAttribute('href');
    link.setAttribute('href', href);
    return () => link.setAttribute('href', previous);
  }, [href]);
}
