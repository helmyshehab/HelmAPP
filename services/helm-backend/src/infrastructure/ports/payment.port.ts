export type PaymentIntent = {
  bookingId: string;
  amountEgp: string;
  currency: 'EGP';
};

export type PaymentSession = {
  provider: string;
  clientPayload: Record<string, unknown>;
};

/** Port for payment providers. Real vendors require Helmy approval. */
export interface PaymentPort {
  createSession(intent: PaymentIntent): Promise<PaymentSession>;
}

export const PAYMENT_PORT = Symbol('PAYMENT_PORT');
