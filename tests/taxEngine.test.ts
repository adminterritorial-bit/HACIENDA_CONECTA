import { describe, expect, it } from "vitest";
import { calculateIca, calculateReteIca } from "../src/domain/taxEngine.js";

const tariffs = new Map([
  ["1011", { ciiu:"1011", activity:"Procesamiento de carne", ratePerThousand:5, source:"test" }],
  ["3311", { ciiu:"3311", activity:"Mantenimiento metal", ratePerThousand:10, source:"test" }]
]);

describe("ICA", () => {
  it("aplica tarifa por mil y redondea al millar", () => {
    const result = calculateIca({
      activities:[{ciiu:"1011", taxableIncomeCop:100_000_000}],
      tariffs,
      uvtValueCop:49_799,
      minimumTaxUvt:2,
      applyNoticesAndBoards:false
    });
    expect(result.icaCop).toBe(500_000);
    expect(result.totalBeforeCreditsCop).toBe(500_000);
  });

  it("calcula avisos y tableros al 15 por ciento", () => {
    const result = calculateIca({
      activities:[{ciiu:"1011", taxableIncomeCop:100_000_000}],
      tariffs,
      uvtValueCop:49_799,
      applyNoticesAndBoards:true
    });
    expect(result.noticesAndBoardsCop).toBe(75_000);
    expect(result.totalBeforeCreditsCop).toBe(575_000);
  });

  it("no vuelve a cargar avisos sobre el mínimo de 2 UVT", () => {
    const result = calculateIca({
      activities:[{ciiu:"1011", taxableIncomeCop:1_000_000}],
      tariffs,
      uvtValueCop:50_000,
      minimumTaxUvt:2,
      applyNoticesAndBoards:true
    });
    expect(result.totalBeforeCreditsCop).toBe(100_000);
    expect(result.minimumAdjustmentCop).toBeGreaterThan(0);
  });

  it("rechaza CIIU sin tarifa validada", () => {
    expect(() => calculateIca({
      activities:[{ciiu:"9998", taxableIncomeCop:10_000}],
      tariffs,
      uvtValueCop:49_799
    })).toThrow(/tarifa validada/i);
  });
});

describe("RETEICA", () => {
  it("respeta base mínima en UVT para servicios", () => {
    const result = calculateReteIca({
      transactions:[{ciiu:"3311", concept:"services", baseCop:300_000}],
      tariffs,
      uvtValueCop:50_000,
      servicesMinimumUvt:4
    });
    expect(result.totalWithheldCop).toBe(3_000);
  });

  it("no retiene por debajo del umbral", () => {
    const result = calculateReteIca({
      transactions:[{ciiu:"3311", concept:"services", baseCop:199_999}],
      tariffs,
      uvtValueCop:50_000,
      servicesMinimumUvt:4
    });
    expect(result.totalWithheldCop).toBe(0);
  });
});
