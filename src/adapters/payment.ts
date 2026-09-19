import { randomUUID } from "node:crypto";

export type PaymentStatus = "CREATED" | "PENDING" | "APPROVED" | "DECLINED" | "VOIDED";

export type PaymentIntent = {
  id: string;
  reference: string;
  amountCop: number;
  status: PaymentStatus;
  provider: string;
  createdAt: string;
};

export interface PaymentGateway {
  createIntent(input: { reference: string; amountCop: number }): Promise<PaymentIntent>;
  verify(input: { paymentId: string }): Promise<PaymentIntent>;
}

export class MockPaymentGateway implements PaymentGateway {
  private readonly intents = new Map<string, PaymentIntent>();

  async createIntent(input: { reference: string; amountCop: number }): Promise<PaymentIntent> {
    if (!Number.isInteger(input.amountCop) || input.amountCop < 0) {
      throw new Error("Monto de pago inválido.");
    }
    const intent: PaymentIntent = {
      id: randomUUID(),
      reference: input.reference,
      amountCop: input.amountCop,
      status: "PENDING",
      provider: "mock",
      createdAt: new Date().toISOString()
    };
    this.intents.set(intent.id, intent);
    return intent;
  }

  async verify(input: { paymentId: string }): Promise<PaymentIntent> {
    const intent = this.intents.get(input.paymentId);
    if (!intent) throw new Error("Pago no encontrado.");
    return intent;
  }

  // Exclusivo para pruebas locales.
  approveForDevelopment(paymentId: string) {
    const intent = this.intents.get(paymentId);
    if (!intent) throw new Error("Pago no encontrado.");
    intent.status = "APPROVED";
    return intent;
  }
}
