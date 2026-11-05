import { isNetworkError, NETWORK_MESSAGE } from './networkErrors';

// Messages d'erreur Supabase Auth traduits pour l'utilisateur.
export function authErrorMessage(err) {
  if (isNetworkError(err)) return NETWORK_MESSAGE;
  const message = String(err?.message || '');
  if (message === 'Invalid login credentials') return 'Email ou mot de passe incorrect.';
  if (/email not confirmed/i.test(message)) return "Confirmez d'abord votre adresse email grâce au lien reçu.";
  if (/already registered|already been registered/i.test(message)) return 'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.';
  if (/should be different|same password/i.test(message)) return "Choisissez un mot de passe différent de l'ancien.";
  if (/rate limit|too many/i.test(message)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (/network|fetch/i.test(message)) return 'Connexion impossible. Vérifiez votre accès à internet.';
  return message || 'Une erreur est survenue. Réessayez.';
}
