// Numéro pour un lien WhatsApp (https://wa.me/…) : chiffres seuls, au format international.
// Un numéro sénégalais saisi sans indicatif (« 77 123 45 67 », « 33 820 00 00 ») reçoit le 221.
export function whatsappNumber(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && /^[37]/.test(digits)) digits = `221${digits}`;
  return digits;
}
