// Notifications WhatsApp : numéros et contenu des messages.
import { describe, it, expect, beforeAll } from 'vitest';

let toWhatsAppNumber, buildNotificationMessage;
beforeAll(async () => {
  Object.assign(process.env, { SUPABASE_URL: 'http://supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'service-test', FRONTEND_URL: 'https://samaboutik.test' });
  ({ toWhatsAppNumber } = await import('../../server/lib/whatsapp.js'));
  ({ buildNotificationMessage } = await import('../../server/lib/notificationMessages.js'));
});

describe('Numéros WhatsApp', () => {
  it('ajoute l’indicatif du Sénégal aux numéros à 9 chiffres', () => {
    expect(toWhatsAppNumber('77 123 45 67')).toBe('221771234567');
    expect(toWhatsAppNumber('+221 76 000 00 01')).toBe('221760000001');
    expect(toWhatsAppNumber('00221781112233')).toBe('221781112233');
  });
  it('refuse les numéros inutilisables', () => {
    expect(toWhatsAppNumber('abc')).toBeNull();
    expect(toWhatsAppNumber('12345')).toBeNull();
    expect(toWhatsAppNumber('')).toBeNull();
  });
});

describe('Messages', () => {
  const order = {
    order_ref: 'AB12CD34', shop_name: 'Chez Awa', customer_name: 'Fatou', customer_phone: '781112233',
    customer_address: 'Médina, rue 11 || GPS: https://maps.google.com/?q=14.6,-17.4', delivery_zone: 'Dakar Plateau / Médina',
    total_amount_fcfa: 51000, cart_items: [{ name: 'Boubou (M)', quantity: 2 }], delivery_pin: '4827', payment_method: 'ON_DELIVERY',
  };

  it('confirme la commande au client avec son code et le lien de suivi', () => {
    const { text, template } = buildNotificationMessage('customer_order_confirmed', order);
    expect(text).toContain('4827');
    expect(text).toContain('https://samaboutik.test/boutique/Chez%20Awa?suivi=781112233');
    expect(text).toMatch(/51\s000 F/);
    expect(template.name).toBe('samaboutik_commande_confirmee');
    expect(template.params).toHaveLength(7);
  });

  it('prévient le marchand avec l’adresse et la position GPS séparées', () => {
    const { text } = buildNotificationMessage('merchant_new_order', order);
    expect(text).toContain('📍 Médina, rue 11 (Dakar Plateau / Médina)');
    expect(text).toContain('Position GPS : https://maps.google.com/?q=14.6,-17.4');
  });

  it('n’envoie rien pour un événement inconnu', () => {
    expect(buildNotificationMessage('inconnu', order)).toBeNull();
  });
});
