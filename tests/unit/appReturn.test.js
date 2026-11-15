// Page /retour-app : rouvre l'application après un paiement, jamais un site extérieur.
import { describe, it, expect } from 'vitest';
import { appReturnTarget, appReturnStatus } from '../../src/utils/appReturn';

const qs = (params) => `?${new URLSearchParams(params).toString()}`;
const ID = '1bca878a-1111-4222-8333-444455556666';

describe('Retour dans l’application après un paiement', () => {
  it('rouvre l’application avec le numéro de commande et l’état du paiement', () => {
    expect(appReturnTarget(qs({ statut: 'paye', commande: ID, to: 'exp://10.0.0.5:8085/--/paiement-termine' })))
      .toBe(`exp://10.0.0.5:8085/--/paiement-termine?commande=${ID}&statut=paye`);
    expect(appReturnTarget(qs({ statut: 'annule', commande: ID, to: 'samaboutik://paiement-termine' })))
      .toBe(`samaboutik://paiement-termine?commande=${ID}&statut=annule`);
    expect(appReturnStatus(qs({ statut: 'nimporte' }))).toBe('paye');
  });

  it('refuse toute adresse qui n’est pas celle de l’application', () => {
    for (const to of ['https://site-pirate.test', 'javascript:alert(1)', '//site-pirate.test', 'exp://', '', 'samaboutik://a b']) {
      expect(appReturnTarget(qs({ statut: 'paye', commande: ID, to }))).toBeNull();
    }
  });

  it('nettoie le numéro de commande', () => {
    expect(appReturnTarget(qs({ commande: `${ID}"><script>`, to: 'samaboutik://paiement-termine' })))
      .toBe(`samaboutik://paiement-termine?commande=${ID}&statut=paye`);
  });
});
