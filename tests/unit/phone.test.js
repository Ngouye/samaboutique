// Liens WhatsApp de l'annuaire et des vitrines : numéro au format international.
import { describe, it, expect } from 'vitest';
import { whatsappNumber, phoneKey, canonicalPhone, cleanPin, formatPhone, telHref } from '../../src/utils/phone';

describe('Numéro WhatsApp', () => {
  it('garde un numéro international, sans espaces ni +', () => {
    expect(whatsappNumber('+221771234567')).toBe('221771234567');
    expect(whatsappNumber('+221 77 123 45 67')).toBe('221771234567');
    expect(whatsappNumber('00221 77 123 45 67')).toBe('221771234567');
    expect(whatsappNumber('+33 6 12 34 56 78')).toBe('33612345678');
  });

  it('ajoute l’indicatif du Sénégal à un numéro local', () => {
    expect(whatsappNumber('77 123 45 67')).toBe('221771234567');
    expect(whatsappNumber('33-820-00-00')).toBe('221338200000');
  });

  it('renvoie une chaîne vide sans numéro', () => {
    expect(whatsappNumber(null)).toBe('');
    expect(whatsappNumber('')).toBe('');
  });
});

describe('Suivi de commande : téléphone et code PIN', () => {
  it('compare les numéros sans espaces, tirets ni indicatif', () => {
    const key = '771234567';
    for (const v of ['77 123 45 67', '771234567', '77-123-45-67', '+221 77 123 45 67', '+221771234567', '00221 77 123 45 67', '221771234567']) {
      expect(phoneKey(v)).toBe(key);
    }
    expect(phoneKey(null)).toBe('');
  });

  it('enregistre toujours un numéro sénégalais au format +221', () => {
    expect(canonicalPhone(' 77 123 45 67 ')).toBe('+221771234567');
    expect(canonicalPhone('00221 76-111-22-33')).toBe('+221761112233');
    expect(canonicalPhone('33 820 00 00')).toBe('+221338200000');
    expect(canonicalPhone('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(canonicalPhone('12345')).toBe('12345');
  });

  it('nettoie le code PIN', () => {
    expect(cleanPin(' 12 34 ')).toBe('1234');
    expect(cleanPin('ab-12')).toBe('AB12');
    expect(cleanPin(undefined)).toBe('');
  });
});

describe('Affichage et appel', () => {
  it('écrit un numéro sénégalais par groupes', () => {
    expect(formatPhone('77 9527784')).toBe('77 952 77 84');
    expect(formatPhone('+221779527784')).toBe('77 952 77 84');
    expect(formatPhone('+33 6 12 34 56 78')).toBe('+33 6 12 34 56 78');
    expect(formatPhone(null)).toBe('');
  });

  it('prépare le lien d’appel au format international', () => {
    expect(telHref('77 9527784')).toBe('tel:+221779527784');
    expect(telHref('+33 6 12 34 56 78')).toBe('tel:+33612345678');
  });
});
