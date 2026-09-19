import { describe, expect, it } from "vitest";
import { validateTaxRegistry } from "../src/domain/taxRegistry.js";

const base = {
  personType:"NATURAL" as const,
  documentType:"CC" as const,
  documentNumber:"123456789",
  fullNameOrBusinessName:"Persona de Prueba",
  email:"persona@example.com",
  phoneE164:"+573001234567",
  fiscalAddress:"Calle 1 # 2-3",
  municipality:"San Pedro",
  department:"Valle del Cauca",
  economicActivities:[{ciiu:"1011",primary:true}],
  hasCommercialEstablishment:false,
  dataPolicyAccepted:true as const,
  dataPolicyVersion:"2026-01"
};

describe("tax registry", () => {
  it("normaliza un registro válido sin exponer identificador en la huella", () => {
    const result = validateTaxRegistry(base);
    expect(result.valid).toBe(true);
    expect(result.normalized.documentNumberHash).toHaveLength(64);
    expect(result.normalized.email).toBe("persona@example.com");
  });

  it("exige representante para persona jurídica", () => {
    expect(() => validateTaxRegistry({
      ...base,
      personType:"JURIDICA",
      documentType:"NIT",
      fullNameOrBusinessName:"Empresa SAS"
    })).toThrow(/representante/i);
  });

  it("exige una sola actividad principal", () => {
    expect(() => validateTaxRegistry({
      ...base,
      economicActivities:[{ciiu:"1011",primary:false}]
    })).toThrow(/principal/i);
  });
});
