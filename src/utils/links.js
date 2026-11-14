// Actions de contact déclenchées par un bouton plutôt que par un lien : sur ordinateur,
// le navigateur n'affiche pas l'adresse du lien (« tel:… », « https://wa.me/… ») en bas de l'écran.
import { telHref } from './phone';

export const callPhone = (phone) => {
  window.location.href = telHref(phone);
};

export const openExternal = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};
