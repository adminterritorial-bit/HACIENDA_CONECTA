import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

type Challenge = {
  id: string;
  userId: string;
  documentHash: string;
  otpHash: Buffer;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  consumedAt: number | null;
};

const challenges = new Map<string, Challenge>();

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function sha256Document(payload: string | Buffer): string {
  return createHash("sha256").update(payload).digest("hex");
}

export function createSignatureChallenge(params: {
  userId: string;
  documentHash: string;
  ttlSeconds: number;
  maxAttempts: number;
}) {
  const otp = randomInt(100000, 1000000).toString();
  const id = randomUUID();
  const challenge: Challenge = {
    id,
    userId: params.userId,
    documentHash: params.documentHash,
    otpHash: digest(otp),
    expiresAt: Date.now() + params.ttlSeconds * 1000,
    attempts: 0,
    maxAttempts: params.maxAttempts,
    consumedAt: null
  };
  challenges.set(id, challenge);

  return { id, otp, expiresAt: new Date(challenge.expiresAt).toISOString() };
}

export function verifySignatureChallenge(params: {
  challengeId: string;
  userId: string;
  documentHash: string;
  otp: string;
}) {
  const challenge = challenges.get(params.challengeId);
  if (!challenge) throw new Error("Reto inexistente.");
  if (challenge.consumedAt) throw new Error("Reto ya utilizado.");
  if (Date.now() > challenge.expiresAt) throw new Error("Reto expirado.");
  if (challenge.attempts >= challenge.maxAttempts) throw new Error("Reto bloqueado.");
  if (challenge.userId !== params.userId) throw new Error("Usuario no coincide.");
  if (challenge.documentHash !== params.documentHash) {
    throw new Error("El documento cambió desde que se generó el reto.");
  }

  challenge.attempts += 1;
  const candidate = digest(params.otp);
  if (!timingSafeEqual(candidate, challenge.otpHash)) {
    throw new Error("Código de verificación inválido.");
  }

  challenge.consumedAt = Date.now();
  return {
    verified: true,
    verifiedAt: new Date(challenge.consumedAt).toISOString(),
    evidence: {
      challengeId: challenge.id,
      userId: challenge.userId,
      documentHash: challenge.documentHash
    }
  };
}
