import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../src/domain/workflow.js";

describe("workflow", () => {
  it("impide radicar antes de firmar", () => {
    expect(canTransition("DRAFT","FILED")).toBe(false);
    expect(() => assertTransition("DRAFT","FILED")).toThrow();
  });

  it("permite firma después de identidad y preparación", () => {
    expect(canTransition("IDENTITY_VERIFIED","READY_TO_SIGN")).toBe(true);
    expect(canTransition("READY_TO_SIGN","SIGNED")).toBe(true);
  });

  it("no permite certificado antes de radicación", () => {
    expect(canTransition("PAID","CERTIFICATE_AVAILABLE")).toBe(false);
    expect(canTransition("FILED","CERTIFICATE_AVAILABLE")).toBe(true);
  });
});
