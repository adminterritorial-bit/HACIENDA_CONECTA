import { describe, expect, it } from "vitest";
import { createCertificate, verifyCertificateToken } from "../src/domain/certificates.js";

describe("certificates", () => {
  it("genera serial, hash y token verificable", () => {
    const { record, verificationToken } = createCertificate({
      type:"PAZ_Y_SALVO",
      subjectIdHash:"abc123",
      document:"contenido certificado",
      hmacKey:"clave-de-prueba-super-segura"
    });
    expect(record.serial).toMatch(/^SP-PAZY SALVO|^SP-/);
    expect(record.documentSha256).toHaveLength(64);
    expect(verifyCertificateToken(record, verificationToken)).toBe(true);
    expect(verifyCertificateToken(record, "token-incorrecto")).toBe(false);
  });
});
