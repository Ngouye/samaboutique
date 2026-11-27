// Bouton « Installer l'application » : explications adaptées au téléphone ou à l'ordinateur.
import { describe, it, expect } from 'vitest';
import { installPlatform } from '../../src/utils/installPrompt.js';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
};

describe('installPlatform', () => {
  it('iPhone : Safari, ou un autre navigateur (il faudra passer par Safari)', () => {
    expect(installPlatform(UA.iphoneSafari)).toBe('ios');
    expect(installPlatform(UA.iphoneChrome)).toBe('ios-other');
  });
  it('iPad en mode ordinateur (écran tactile) reste un iPad', () => {
    expect(installPlatform(UA.ipadDesktopMode, true)).toBe('ios');
    expect(installPlatform(UA.ipadDesktopMode, false)).toBe('desktop');
  });
  it('Android et ordinateur', () => {
    expect(installPlatform(UA.android)).toBe('android');
    expect(installPlatform(UA.windows)).toBe('desktop');
    expect(installPlatform('')).toBe('desktop');
  });
});
