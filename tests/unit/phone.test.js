// Liens WhatsApp de l'annuaire et des vitrines : numéro au format international.
import { describe, it, expect } from 'vitest';
import { whatsappNumber } from '../../src/utils/phone';

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
