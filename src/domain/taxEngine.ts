export type IcaTariff = {
  ciiu: string;
  activity: string;
  ratePerThousand: number;
  source: string;
};

export type IcaActivityInput = {
  ciiu: string;
  taxableIncomeCop: number;
};

export type IcaCalculation = {
  lines: Array<{
    ciiu: string;
    activity: string;
    taxableIncomeCop: number;
    ratePerThousand: number;
    taxCop: number;
  }>;
  subtotalIcaCop: number;
  minimumTaxCop: number;
  icaCop: number;
  noticesAndBoardsCop: number;
  totalBeforeCreditsCop: number;
};

export function roundToNearestThousand(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Valor no numérico.");
  return Math.round(value / 1000) * 1000;
}

export function calculateIca(params: {
  activities: IcaActivityInput[];
  tariffs: ReadonlyMap<string, IcaTariff>;
  uvtValueCop: number;
  minimumTaxUvt?: number;
  applyNoticesAndBoards?: boolean;
}): IcaCalculation {
  const minimumTaxUvt = params.minimumTaxUvt ?? 2;
  const lines = params.activities.map((input) => {
    if (!Number.isFinite(input.taxableIncomeCop) || input.taxableIncomeCop < 0) {
      throw new Error("Los ingresos gravables deben ser mayores o iguales a cero.");
    }
    const rule = params.tariffs.get(input.ciiu);
    if (!rule) throw new Error(`No existe tarifa validada para CIIU ${input.ciiu}.`);

    const taxCop = roundToNearestThousand(
      input.taxableIncomeCop * (rule.ratePerThousand / 1000)
    );

    return {
      ciiu: input.ciiu,
      activity: rule.activity,
      taxableIncomeCop: input.taxableIncomeCop,
      ratePerThousand: rule.ratePerThousand,
      taxCop
    };
  });

  const subtotalIcaCop = lines.reduce((sum, line) => sum + line.taxCop, 0);
  const minimumTaxCop =
    params.uvtValueCop > 0
      ? roundToNearestThousand(params.uvtValueCop * minimumTaxUvt)
      : 0;
  const icaCop = Math.max(subtotalIcaCop, minimumTaxCop);
  const noticesAndBoardsCop = params.applyNoticesAndBoards
    ? roundToNearestThousand(icaCop * 0.15)
    : 0;

  return {
    lines,
    subtotalIcaCop,
    minimumTaxCop,
    icaCop,
    noticesAndBoardsCop,
    totalBeforeCreditsCop: icaCop + noticesAndBoardsCop
  };
}

export type ReteIcaTransactionInput = {
  ciiu: string;
  concept: "goods" | "services";
  baseCop: number;
};

export function calculateReteIca(params: {
  transactions: ReteIcaTransactionInput[];
  tariffs: ReadonlyMap<string, IcaTariff>;
  uvtValueCop: number;
  goodsMinimumUvt?: number;
  servicesMinimumUvt?: number;
}) {
  if (params.uvtValueCop <= 0) {
    throw new Error("La UVT de la vigencia debe estar configurada para liquidar RETEICA.");
  }

  const goodsThreshold = params.uvtValueCop * (params.goodsMinimumUvt ?? 10);
  const servicesThreshold = params.uvtValueCop * (params.servicesMinimumUvt ?? 4);

  const lines = params.transactions.map((tx) => {
    if (!Number.isFinite(tx.baseCop) || tx.baseCop < 0) {
      throw new Error("La base de retención debe ser mayor o igual a cero.");
    }

    const rule = params.tariffs.get(tx.ciiu);
    if (!rule) throw new Error(`No existe tarifa validada para CIIU ${tx.ciiu}.`);

    const threshold = tx.concept === "goods" ? goodsThreshold : servicesThreshold;
    const subjectToWithholding = tx.baseCop >= threshold;
    const withheldCop = subjectToWithholding
      ? roundToNearestThousand(tx.baseCop * (rule.ratePerThousand / 1000))
      : 0;

    return {
      ...tx,
      activity: rule.activity,
      ratePerThousand: rule.ratePerThousand,
      thresholdCop: threshold,
      subjectToWithholding,
      withheldCop
    };
  });

  return {
    lines,
    totalWithheldCop: lines.reduce((sum, line) => sum + line.withheldCop, 0)
  };
}
