import { createHash, createHmac, randomBytes } from "node:crypto";

export type CertificateRecord = {
  serial: string;
  type: string;
  subjectIdHash: string;
  documentSha256: string;
  issuedAt: string;
  validUntil: string | null;
  verificationTokenHash: string;
  revokedAt: string | null;
};

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createCertificate(params: {
  type: string;
  subjectIdHash: string;
  document: string | Buffer;
  hmacKey: string;
  validUntil?: string | null;
}) {
  const token = randomBytes(24).toString("base64url");
  const issuedAt = new Date().toISOString();
  const documentSha256 = sha256(params.document);
  const serialMaterial = [params.type, params.subjectIdHash, documentSha256, issuedAt, token].join("|");
  const serialDigest = createHmac("sha256", params.hmacKey).update(serialMaterial).digest("hex").slice(0, 20).toUpperCase();
  const serial = "SP-" + params.type.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) + "-" + serialDigest;

  const record: CertificateRecord = {
    serial,
    type: params.type,
    subjectIdHash: params.subjectIdHash,
    documentSha256,
    issuedAt,
    validUntil: params.validUntil ?? null,
    verificationTokenHash: sha256(token),
    revokedAt: null
  };

  return { record, verificationToken: token };
}

export function verifyCertificateToken(record: CertificateRecord, token: string): boolean {
  return record.revokedAt === null && sha256(token) === record.verificationTokenHash;
}
