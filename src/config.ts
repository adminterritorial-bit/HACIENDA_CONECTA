import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_STAGE: z.enum(["development", "preview", "production"]).default("preview"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  AUDIT_HMAC_KEY: z.string().min(16).default("development-only-change-me"),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  TAX_YEAR: z.coerce.number().int().min(2021).max(2100).default(2026),
  UVT_VALUE_COP: z.coerce.number().nonnegative().default(52374),
  ICA_MINIMUM_UVT: z.coerce.number().positive().default(2),
  RETEICA_GOODS_MIN_UVT: z.coerce.number().positive().default(10),
  RETEICA_SERVICES_MIN_UVT: z.coerce.number().positive().default(4),
  PAYMENT_PROVIDER: z.enum(["mock", "wompi", "pse-provider"]).default("mock"),
  SMS_PROVIDER: z.enum(["mock", "twilio", "infobip"]).default("mock"),
  IDENTITY_PROVIDER: z.enum(["mock", "oidc", "autenticacion-digital"]).default("mock")
});

export const config = envSchema.parse(process.env);

if (config.APP_STAGE === "production") {
  const unsafe = [
    ["PAYMENT_PROVIDER", config.PAYMENT_PROVIDER],
    ["SMS_PROVIDER", config.SMS_PROVIDER],
    ["IDENTITY_PROVIDER", config.IDENTITY_PROVIDER]
  ].filter(([, value]) => value === "mock");

  if (unsafe.length > 0) {
    throw new Error(
      "Configuración insegura para producción: " +
        unsafe.map(([name]) => name).join(", ") +
        ". Deben configurarse proveedores reales."
    );
  }

  if (config.UVT_VALUE_COP <= 0) {
    throw new Error("UVT_VALUE_COP debe configurarse para la vigencia antes de iniciar en producción.");
  }
}
