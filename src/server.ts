import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "./config.js";
import {
  calculateIca,
  calculateReteIca,
  type IcaTariff
} from "./domain/taxEngine.js";
import {
  declarationStates,
  assertTransition,
  type DeclarationState
} from "./domain/workflow.js";
import {
  createSignatureChallenge,
  sha256Document,
  verifySignatureChallenge
} from "./security/signature.js";
import { MockPaymentGateway } from "./adapters/payment.js";
import { validateTaxRegistry } from "./domain/taxRegistry.js";

const app = Fastify({
  logger: {
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "body.password",
        "body.otp",
        "body.signatureImage",
        "body.document"
      ],
      censor: "[REDACTED]"
    }
  },
  trustProxy: config.TRUST_PROXY === "true",
  bodyLimit: 1024 * 1024
});

await app.register(helmet, {
  global: true,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  strictTransportSecurity:
    config.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false
});
await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
  ban: 3,
  keyGenerator: (request) => request.ip
});
app.get("/", async (_request, reply) => {
  const html = await readFile(join(process.cwd(), "public", "index.html"), "utf8");
  reply.type("text/html; charset=utf-8").send(html);
});

app.get("/app.js", async (_request, reply) => {
  const script = await readFile(join(process.cwd(), "public", "app.js"), "utf8");
  reply.type("application/javascript; charset=utf-8").send(script);
});

const tariffFile = JSON.parse(
  await readFile(join(process.cwd(), "data", "ica-tariffs-2021.json"), "utf8")
) as { tariffs: IcaTariff[]; metadata: Record<string, unknown> };

const tariffs = new Map(tariffFile.tariffs.map((x) => [x.ciiu, x]));
const legalRegistry = JSON.parse(
  await readFile(join(process.cwd(), "data", "legal-registry.json"), "utf8")
) as Record<string, unknown>;
const moduleStatus = JSON.parse(
  await readFile(join(process.cwd(), "data", "module-status.json"), "utf8")
) as Record<string, unknown>;
const payments = new MockPaymentGateway();
const workflowState = new Map<string, DeclarationState>();

app.addHook("onRequest", async (request, reply) => {
  const requestId = request.headers["x-request-id"]?.toString() ?? randomUUID();
  reply.header("x-request-id", requestId);
  reply.header("cache-control", "no-store");
  reply.header("x-content-type-options", "nosniff");
});

app.get("/health", async () => ({
  ok: true,
  service: "hacienda-conecta",
  stage: config.APP_STAGE,
  taxYear: config.TAX_YEAR,
  uvtValueCop: config.UVT_VALUE_COP,
  tariffRulesLoaded: tariffs.size
}));

app.get("/api/v1/legal-registry", async () => legalRegistry);
app.get("/api/v1/modules", async () => moduleStatus);

app.post("/api/v1/registry/validate", async (request) => {
  return validateTaxRegistry(request.body);
});

app.get("/api/v1/catalog/ica/:ciiu", async (request, reply) => {
  const params = z.object({ ciiu: z.string().regex(/^\d{4}$/) }).parse(request.params);
  const tariff = tariffs.get(params.ciiu);
  if (!tariff) return reply.code(404).send({ error: "Tarifa no encontrada o pendiente de validación." });
  return tariff;
});

app.post("/api/v1/calculate/ica", async (request) => {
  const body = z.object({
    activities: z.array(
      z.object({
        ciiu: z.string().regex(/^\d{4}$/),
        taxableIncomeCop: z.number().nonnegative()
      })
    ).min(1).max(50),
    applyNoticesAndBoards: z.boolean().default(false)
  }).parse(request.body);

  return calculateIca({
    activities: body.activities,
    tariffs,
    uvtValueCop: config.UVT_VALUE_COP,
    minimumTaxUvt: config.ICA_MINIMUM_UVT,
    applyNoticesAndBoards: body.applyNoticesAndBoards
  });
});

app.post("/api/v1/calculate/reteica", async (request) => {
  const body = z.object({
    transactions: z.array(
      z.object({
        ciiu: z.string().regex(/^\d{4}$/),
        concept: z.enum(["goods", "services"]),
        baseCop: z.number().nonnegative()
      })
    ).min(1).max(500)
  }).parse(request.body);

  return calculateReteIca({
    transactions: body.transactions,
    tariffs,
    uvtValueCop: config.UVT_VALUE_COP,
    goodsMinimumUvt: config.RETEICA_GOODS_MIN_UVT,
    servicesMinimumUvt: config.RETEICA_SERVICES_MIN_UVT
  });
});

app.post("/api/v1/workflow/:declarationId/transition", async (request) => {
  const params = z.object({ declarationId: z.string().min(1).max(100) }).parse(request.params);
  const body = z.object({ to: z.enum(declarationStates) }).parse(request.body);
  const from = workflowState.get(params.declarationId) ?? "DRAFT";
  assertTransition(from, body.to);
  workflowState.set(params.declarationId, body.to);
  return { declarationId: params.declarationId, from, to: body.to };
});

app.post("/api/v1/signature/challenge", {
  config: { rateLimit: { max: 5, timeWindow: "10 minutes" } }
}, async (request) => {
  const body = z.object({
    userId: z.string().min(3).max(100),
    document: z.string().min(1).max(500_000)
  }).parse(request.body);

  const documentHash = sha256Document(body.document);
  const challenge = createSignatureChallenge({
    userId: body.userId,
    documentHash,
    ttlSeconds: config.OTP_TTL_SECONDS,
    maxAttempts: config.OTP_MAX_ATTEMPTS
  });

  // En producción el OTP se envía exclusivamente por el proveedor SMS y jamás se devuelve por API.
  return config.APP_STAGE !== "development"
    ? { challengeId: challenge.id, documentHash, expiresAt: challenge.expiresAt }
    : {
        challengeId: challenge.id,
        documentHash,
        expiresAt: challenge.expiresAt,
        developmentOtp: challenge.otp
      };
});

app.post("/api/v1/signature/verify", {
  config: { rateLimit: { max: 10, timeWindow: "10 minutes" } }
}, async (request) => {
  const body = z.object({
    challengeId: z.string().uuid(),
    userId: z.string().min(3).max(100),
    document: z.string().min(1).max(500_000),
    otp: z.string().regex(/^\d{6}$/)
  }).parse(request.body);

  return verifySignatureChallenge({
    challengeId: body.challengeId,
    userId: body.userId,
    documentHash: sha256Document(body.document),
    otp: body.otp
  });
});

app.post("/api/v1/payments", async (request) => {
  const body = z.object({
    reference: z.string().min(6).max(120),
    amountCop: z.number().int().nonnegative()
  }).parse(request.body);
  return payments.createIntent(body);
});

app.get("/api/v1/payments/:paymentId", async (request) => {
  const params = z.object({ paymentId: z.string().uuid() }).parse(request.params);
  return payments.verify(params);
});

if (config.APP_STAGE === "development") {
  app.post("/api/v1/dev/payments/:paymentId/approve", async (request) => {
    const params = z.object({ paymentId: z.string().uuid() }).parse(request.params);
    return payments.approveForDevelopment(params.paymentId);
  });
}

app.setErrorHandler((error, _request, reply) => {
  const status = error instanceof z.ZodError ? 400 : 422;
  app.log.warn({ err: error }, "request rejected");
  const detail = error instanceof Error ? error.message : "Error no identificado";
  reply.code(status).send({
    error: "Solicitud inválida",
    detail: config.NODE_ENV === "production" ? undefined : detail
  });
});

await app.listen({ port: config.PORT, host: "0.0.0.0" });
