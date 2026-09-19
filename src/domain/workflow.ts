export const declarationStates = [
  "DRAFT",
  "IDENTITY_VERIFIED",
  "READY_TO_SIGN",
  "SIGNED",
  "PAYMENT_PENDING",
  "PAID",
  "FILED",
  "CERTIFICATE_AVAILABLE",
  "REJECTED",
  "CANCELLED"
] as const;

export type DeclarationState = (typeof declarationStates)[number];

const allowed: Record<DeclarationState, DeclarationState[]> = {
  DRAFT: ["IDENTITY_VERIFIED", "CANCELLED"],
  IDENTITY_VERIFIED: ["READY_TO_SIGN", "CANCELLED"],
  READY_TO_SIGN: ["SIGNED", "CANCELLED"],
  SIGNED: ["PAYMENT_PENDING", "FILED", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CANCELLED"],
  PAID: ["FILED"],
  FILED: ["CERTIFICATE_AVAILABLE"],
  CERTIFICATE_AVAILABLE: [],
  REJECTED: [],
  CANCELLED: []
};

export function canTransition(from: DeclarationState, to: DeclarationState): boolean {
  return allowed[from].includes(to);
}

export function assertTransition(from: DeclarationState, to: DeclarationState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transición no permitida: ${from} -> ${to}`);
  }
}

export function paymentRequiredForFiling(params: {
  declarationType: "ICA" | "RETEICA";
  balanceDueCop: number;
}): boolean {
  if (params.declarationType === "RETEICA") {
    // El estatuto local prevé reglas especiales de eficacia de declaraciones de retención sin pago.
    return params.balanceDueCop > 0;
  }
  return params.balanceDueCop > 0;
}
