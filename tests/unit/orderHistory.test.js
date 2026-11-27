// Historique vu par le client et bandeau du suivi (application mobile).
import { describe, it, expect } from 'vitest';
import { customerTimeline, trackingNotice } from '../../src/utils/orderHistory.js';

const NOW = Date.parse('2026-11-27T12:00:00Z');
const at = (min) => new Date(NOW - min * 60000).toISOString();

describe('customerTimeline', () => {
  it('traduit chaque étape en phrase, dans l’ordre', () => {
    const steps = customerTimeline([
      { kind: 'created', at: at(90) },
      { kind: 'deposit_paid', at: at(89) },
      { kind: 'accepted', at: at(80) },
      { kind: 'driver_taken', name: 'Mamadou', at: at(60) },
      { kind: 'driver_calling', at: at(40) },
      { kind: 'driver_changed', at: at(35) },
      { kind: 'driver_taken', name: 'Lamine', at: at(20) },
      { kind: 'delivered', at: at(5) },
    ]);
    expect(steps.map((s) => s.label)).toEqual([
      'Commande passée', 'Acompte payé', 'Commande acceptée par la boutique', 'Mamadou a pris votre colis',
      'Votre livreur a essayé de vous joindre', 'Changement de livreur', 'Lamine a pris votre colis', 'Commande livrée',
    ]);
  });

  it('une commande reprise au livreur par la boutique devient « changement de livreur »', () => {
    const steps = customerTimeline([{ kind: 'accepted' }, { kind: 'driver_taken', name: 'Awa' }, { kind: 'accepted' }]);
    expect(steps.map((s) => s.kind)).toEqual(['accepted', 'driver_taken', 'driver_changed']);
  });

  it('ignore les étapes inconnues et regroupe les répétitions en gardant l’heure la plus récente', () => {
    const steps = customerTimeline([{ kind: 'mystere' }, { kind: 'driver_calling', at: at(30) }, { kind: 'driver_calling', at: at(10) }, null]);
    expect(steps).toHaveLength(1);
    expect(steps[0].at).toBe(at(10));
    expect(customerTimeline(undefined)).toEqual([]);
  });

  it('livreur sans nom', () => {
    expect(customerTimeline([{ kind: 'driver_taken', name: '  ' }])[0].label).toBe('Le livreur a pris votre colis');
  });
});

describe('trackingNotice', () => {
  const taken = { kind: 'driver_taken', name: 'Mamadou', at: at(30) };

  it('en livraison, le livreur essaie de joindre le client : bandeau avec appel', () => {
    const notice = trackingNotice({ status: 'IN_TRANSIT' }, [taken, { kind: 'driver_calling', at: at(5) }], NOW);
    expect(notice).toMatchObject({ kind: 'driver_calling', call: true, title: 'Votre livreur essaie de vous joindre' });
  });

  it('adresse introuvable : bandeau pour guider le livreur', () => {
    expect(trackingNotice({ status: 'IN_TRANSIT' }, [taken, { kind: 'driver_lost', at: at(5) }], NOW).kind).toBe('driver_lost');
  });

  it('pas de bandeau si un nouveau livreur a pris la course, si l’appel est ancien ou si la commande est livrée', () => {
    expect(trackingNotice({ status: 'IN_TRANSIT' }, [{ kind: 'driver_calling', at: at(50) }, taken], NOW)).toBeNull();
    expect(trackingNotice({ status: 'IN_TRANSIT' }, [taken, { kind: 'driver_calling', at: at(200) }], NOW)).toBeNull();
    expect(trackingNotice({ status: 'DELIVERED' }, [taken, { kind: 'driver_calling', at: at(5) }], NOW)).toBeNull();
    expect(trackingNotice({ status: 'IN_TRANSIT' }, [], NOW)).toBeNull();
  });

  it('course rendue : changement de livreur tant qu’aucun autre ne l’a prise', () => {
    const events = [{ kind: 'accepted' }, taken, { kind: 'driver_changed', at: at(3) }];
    expect(trackingNotice({ status: 'PREPARING' }, events, NOW)).toMatchObject({ kind: 'driver_changed', call: false });
    expect(trackingNotice({ status: 'PREPARING' }, [{ kind: 'accepted' }], NOW)).toBeNull();
    expect(trackingNotice(null, events, NOW)).toBeNull();
  });
});
