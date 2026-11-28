import { describe, expect, it } from 'vitest';
import { decodePolyline, metersBetween, parseRoute, stepKind } from '../../src/utils/route';

describe('itinéraire par la route', () => {
  it('décode un tracé encodé (exemple de référence de Google, précision 5)', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(points).toEqual([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
  });

  it('mesure une distance en mètres', () => {
    const d = metersBetween([14.6937, -17.4441], [14.7167, -17.4677]);
    expect(d).toBeGreaterThan(3500);
    expect(d).toBeLessThan(3700);
  });

  it('associe chaque manœuvre à une icône', () => {
    expect(stepKind(1)).toBe('start');
    expect(stepKind(10)).toBe('right');
    expect(stepKind(15)).toBe('left');
    expect(stepKind(26)).toBe('roundabout');
    expect(stepKind(4)).toBe('arrive');
    expect(stepKind(8)).toBe('straight');
  });

  it('lit la réponse du service : tracé, distance, durée, étapes en français', () => {
    const route = parseRoute({
      trip: {
        summary: { length: 4.753, time: 960 },
        legs: [{
          shape: '_p~iF~ps|U_ulLnnqC',
          maneuvers: [
            { type: 1, instruction: 'Conduisez vers le sud-ouest.', length: 0.012 },
            { type: 10, instruction: 'Tournez à droite dans Rue 14.', street_names: ['Rue 14'], length: 0.448 },
          ],
        }],
      },
    });
    expect(route.km).toBe(4.753);
    expect(route.minutes).toBe(16);
    expect(route.coords.length).toBe(2);
    expect(route.steps[1]).toEqual({ text: 'Tournez à droite dans Rue 14.', street: 'Rue 14', km: 0.448, kind: 'right' });
  });

  it('renvoie null quand la réponse est vide', () => {
    expect(parseRoute({})).toBeNull();
  });
});
