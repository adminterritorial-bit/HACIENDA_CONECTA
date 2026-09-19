import { createHash } from "node:crypto";
import { z } from "zod";

export const taxRegistrySchema = z.object({
  personType: z.enum(["NATURAL", "JURIDICA"]),
  documentType: z.enum(["CC", "CE", "NIT", "PASAPORTE", "OTRO"]),
  documentNumber: z.string().trim().min(5).max(30).regex(/^[A-Za-z0-9.-]+$/),
  fullNameOrBusinessName: z.string().trim().min(3).max(200),
  email: z.string().trim().email().max(254),
  phoneE164: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
  fiscalAddress: z.string().trim().min(5).max(250),
  municipality: z.string().trim().min(2).max(100),
  department: z.string().trim().min(2).max(100),
  economicActivities: z.array(z.object({
    ciiu: z.string().regex(/^\d{4}$/),
    primary: z.boolean().default(false)
  })).min(1).max(20),
  hasCommercialEstablishment: z.boolean().default(false),
  establishmentName: z.string().trim().min(2).max(200).optional(),
  representative: z.object({
    documentType: z.string().trim().min(2).max(20),
    documentNumber: z.string().trim().min(5).max(30),
    fullName: z.string().trim().min(3).max(200),
    email: z.string().trim().email().max(254)
  }).optional(),
  accountant: z.object({
    documentNumber: z.string().trim().min(5).max(30),
    fullName: z.string().trim().min(3).max(200),
    professionalCard: z.string().trim().min(2).max(50)
  }).optional(),
  dataPolicyAccepted: z.literal(true),
  dataPolicyVersion: z.string().trim().min(1).max(50)
}).superRefine((value, ctx) => {
  if (value.personType === "JURIDICA" && value.documentType !== "NIT") {
    ctx.addIssue({ code: "custom", path: ["documentType"], message: "Persona jurídica debe identificarse con NIT." });
  }
  if (value.personType === "JURIDICA" && !value.representative) {
    ctx.addIssue({ code: "custom", path: ["representative"], message: "La persona jurídica requiere representante legal." });
  }
  if (value.hasCommercialEstablishment && !value.establishmentName) {
    ctx.addIssue({ code: "custom", path: ["establishmentName"], message: "Debe indicar el nombre del establecimiento." });
  }
  const primary = value.economicActivities.filter((x) => x.primary);
  if (primary.length !== 1) {
    ctx.addIssue({ code: "custom", path: ["economicActivities"], message: "Debe existir exactamente una actividad económica principal." });
  }
});

export type TaxRegistryInput = z.infer<typeof taxRegistrySchema>;

export function hashTaxIdentifier(documentType: string, documentNumber: string): string {
  return createHash("sha256")
    .update(documentType.toUpperCase() + ":" + documentNumber.trim().toUpperCase())
    .digest("hex");
}

export function validateTaxRegistry(input: unknown) {
  const parsed = taxRegistrySchema.parse(input);
  return {
    valid: true as const,
    normalized: {
      ...parsed,
      email: parsed.email.toLowerCase(),
      documentNumberHash: hashTaxIdentifier(parsed.documentType, parsed.documentNumber)
    }
  };
}
