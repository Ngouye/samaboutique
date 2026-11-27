// Comptes de réception des paiements : plusieurs choix possibles, enregistrés dans un seul champ.
import { describe, it, expect } from 'vitest';
import { parsePayoutProviders, serializePayoutProviders, formatPayoutProviders } from '../../src/utils/payout.js';

describe('Réception des paiements', () => {
  it('lit un ou plusieurs comptes, dans l’ordre de la liste, sans doublon', () => {
    expect(parsePayoutProviders('WAVE')).toEqual(['WAVE']);
    expect(parsePayoutProviders('free_money, wave,WAVE')).toEqual(['WAVE', 'FREE_MONEY']);
    expect(parsePayoutProviders('OM + Free')).toEqual(['ORANGE_MONEY', 'FREE_MONEY']);
    expect(parsePayoutProviders('Orange Money')).toEqual(['ORANGE_MONEY']);
    expect(parsePayoutProviders('PAYPAL')).toEqual([]);
    expect(parsePayoutProviders(null)).toEqual([]);
  });

  it('enregistre la liste en un seul champ', () => {
    expect(serializePayoutProviders(['FREE_MONEY', 'WAVE', 'ORANGE_MONEY'])).toBe('WAVE,ORANGE_MONEY,FREE_MONEY');
    expect(serializePayoutProviders([])).toBe('');
  });

  it('affiche des noms lisibles', () => {
    expect(formatPayoutProviders('WAVE,ORANGE_MONEY')).toBe('Wave + Orange Money');
    expect(formatPayoutProviders(['FREE_MONEY'])).toBe('Free Money');
    expect(formatPayoutProviders('')).toBe('');
  });
});
