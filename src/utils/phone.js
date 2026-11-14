// Numéro pour un lien WhatsApp (https://wa.me/…) : chiffres seuls, au format international.
// Un numéro sénégalais saisi sans indicatif (« 77 123 45 67 », « 33 820 00 00 ») reçoit le 221.
export function whatsappNumber(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && /^[37]/.test(digits)) digits = `221${digits}`;
  return digits;
}

// Clé de comparaison d'un numéro : chiffres seuls, sans l'indicatif du Sénégal.
// « +221 77 123 45 67 », « 00221771234567 », « 77-123-45-67 » → « 771234567 »
export function phoneKey(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith('221')) digits = digits.slice(3);
  return digits;
}

// Numéro enregistré avec une commande, toujours écrit de la même façon :
// « +221 » suivi des 9 chiffres pour un numéro sénégalais, « + » et les chiffres pour un
// numéro étranger saisi avec son indicatif, sinon le texte saisi (sans espaces autour).
export function canonicalPhone(phone) {
  const raw = String(phone || '').trim();
  const key = phoneKey(raw);
  if (key.length === 9 && /^[37]/.test(key)) return `+221${key}`;
  const digits = raw.replace(/\D/g, '').replace(/^00/, '');
  if (/^(\+|00)/.test(raw) && digits.length >= 8) return `+${digits}`;
  return raw;
}

// Code PIN de livraison : chiffres et lettres seulement, en majuscules (« 12 34 » → « 1234 »).
export const cleanPin = (pin) => String(pin || '').replace(/[^0-9a-z]/gi, '').toUpperCase();

// Affichage lisible : « 779527784 », « +221 77 9527784 » → « 77 952 77 84 ».
export function formatPhone(phone) {
  const key = phoneKey(phone);
  if (key.length === 9 && /^[37]/.test(key)) return `${key.slice(0, 2)} ${key.slice(2, 5)} ${key.slice(5, 7)} ${key.slice(7)}`;
  return String(phone || '').trim();
}

// Lien d'appel au format international : « tel:+221779527784 ».
export const telHref = (phone) => `tel:${canonicalPhone(phone).replace(/[^\d+]/g, '')}`;
