import { Injectable } from '@nestjs/common';
import type { PaymentIntent, PaymentPort, PaymentSession } from '../../ports/payment.port';

/**
 * MOCK payment adapter — local MVP without paid payment APIs.
 * Not for production. Enabling a real provider requires Helmy approval (BD-01).
 */
@Injectable()
export class MockPaymentAdapter implements PaymentPort {
  async createSession(intent: PaymentIntent): Promise<PaymentSession> {
    return {
      provider: 'mock',
      clientPayload: {
        mock: true,
        bookingId: intent.bookingId,
        amountEgp: intent.amountEgp,
        currency: intent.currency,
        message: 'MOCK: no real charge performed',
      },
    };
  }
}
