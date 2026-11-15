// Moyens de paiement : acompte du paiement à la livraison, commandes en attente de paiement.
import { describe, it, expect } from 'vitest';
import { depositFor, depositAmount, depositPaid, awaitingPayment, paymentLabel } from '../../src/utils/payments';
import { depositFor as serverDepositFor } from '../../server/lib/deposit.js';

describe('Acompte de 10 %', () => {
  it('10 % du total, arrondi aux 5 F supérieurs, jamais plus que le total', () => {
    expect(depositFor(51000)).toBe(5100);
    expect(depositFor(12730)).toBe(1275);
    expect(depositFor(10001)).toBe(1005);
    expect(depositFor(3)).toBe(3);
    expect(depositFor(0)).toBe(0);
    expect(depositFor(undefined)).toBe(0);
  });

  it('même calcul que le serveur', () => {
    for (const total of [0, 1, 49, 50, 999, 1000, 2730, 12730, 51000, 123457]) expect(depositFor(total)).toBe(serverDepositFor(total));
  });

  it('lit l’acompte d’une commande et son état', () => {
    const order = { payment_method: 'DEPOSIT', total_amount_fcfa: 12730, payment_deposit_amount: 1275, payment_status: 'DEPOSIT_PAID' };
    expect(depositAmount(order)).toBe(1275);
    expect(depositAmount({ ...order, payment_deposit_amount: null })).toBe(1275);
    expect(depositPaid(order)).toBe(true);
    expect(depositPaid({ ...order, payment_status: 'PENDING' })).toBe(false);
    expect(depositAmount({ payment_method: 'ON_DELIVERY', total_amount_fcfa: 12730 })).toBe(0);
    expect(paymentLabel(order)).toBe('Acompte + livraison');
  });
});

describe('Commandes en attente de paiement (cachées à la boutique)', () => {
  it('cache les paiements en ligne et les acomptes non confirmés', () => {
    expect(awaitingPayment({ status: 'PENDING', payment_method: 'MOBILE_MONEY', payment_status: 'PENDING' })).toBe(true);
    expect(awaitingPayment({ status: 'PENDING', payment_method: 'MOBILE_MONEY', payment_status: 'AMOUNT_MISMATCH' })).toBe(true);
    expect(awaitingPayment({ status: 'PENDING', payment_method: 'DEPOSIT', payment_status: 'PENDING' })).toBe(true);
  });

  it('montre les commandes payées, à la livraison ou déjà prises en charge', () => {
    expect(awaitingPayment({ status: 'PREPARING', payment_method: 'MOBILE_MONEY', payment_status: 'PAID' })).toBe(false);
    expect(awaitingPayment({ status: 'PENDING', payment_method: 'DEPOSIT', payment_status: 'DEPOSIT_PAID' })).toBe(false);
    expect(awaitingPayment({ status: 'PENDING', payment_method: 'ON_DELIVERY', payment_status: 'PENDING' })).toBe(false);
    expect(awaitingPayment({ status: 'CANCELLED', payment_method: 'DEPOSIT', payment_status: 'PENDING' })).toBe(false);
  });
});
