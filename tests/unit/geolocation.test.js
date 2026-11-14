import { describe, it, expect } from 'vitest';
import { parseCoordinates, isShortMapsLink } from '../../src/utils/geolocation';

describe('parseCoordinates : position collée par le commerçant', () => {
  it('lit les chiffres copiés depuis Google Maps', () => {
    expect(parseCoordinates('14.69282, -17.44670')).toEqual({ lat: 14.69282, lng: -17.4467 });
    expect(parseCoordinates('  14.69282 -17.44670 ')).toEqual({ lat: 14.69282, lng: -17.4467 });
    expect(parseCoordinates('14.69282;-17.44670')).toEqual({ lat: 14.69282, lng: -17.4467 });
  });

  it('accepte la virgule décimale à la française', () => {
    expect(parseCoordinates('14,69282 ; -17,44670')).toEqual({ lat: 14.69282, lng: -17.4467 });
    expect(parseCoordinates('14,69282 -17,44670')).toEqual({ lat: 14.69282, lng: -17.4467 });
  });

  it('lit un lien Google Maps et préfère le point exact au centre de la carte', () => {
    expect(parseCoordinates('https://www.google.com/maps/@14.6928,-17.4467,17z')).toEqual({ lat: 14.6928, lng: -17.4467 });
    expect(parseCoordinates('https://www.google.com/maps/search/?api=1&query=14.7,-17.45')).toEqual({ lat: 14.7, lng: -17.45 });
    expect(parseCoordinates('https://www.google.com/maps/place/March%C3%A9+Sandaga/@14.6700,-17.4400,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d14.6712345!4d-17.4387654')).toEqual({ lat: 14.671235, lng: -17.438765 });
  });

  it('lit les degrés, minutes, secondes', () => {
    const p = parseCoordinates(`14°41'34.2"N 17°26'48.1"W`);
    expect(p.lat).toBeCloseTo(14.69283, 4);
    expect(p.lng).toBeCloseTo(-17.44669, 4);
  });

  it('refuse le reste', () => {
    expect(parseCoordinates('')).toBeNull();
    expect(parseCoordinates('Dakar, Plateau')).toBeNull();
    expect(parseCoordinates('0.0, 0.0')).toBeNull();
    expect(parseCoordinates('95.1, -17.4')).toBeNull();
    expect(parseCoordinates('https://maps.app.goo.gl/AbCdEf123')).toBeNull();
  });

  it('reconnaît les liens courts, qui ne contiennent pas la position', () => {
    expect(isShortMapsLink('https://maps.app.goo.gl/AbCdEf123')).toBe(true);
    expect(isShortMapsLink('https://goo.gl/maps/xyz')).toBe(true);
    expect(isShortMapsLink('14.69, -17.44')).toBe(false);
  });
});
