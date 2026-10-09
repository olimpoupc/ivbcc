import { describe, expect, it } from "vitest";
import {
  colombiaStartOfDay,
  fetchInBatches,
  getYearOptions,
  groupDonationsByPeriod,
  isValidIsoDate,
  monthRange,
  presetToRange,
  rangeToUtcBounds,
  resolveDateFilter,
  summarizeDonations,
  toColombiaDate,
  yearRange,
  type CalendarDate,
  type DonationSummaryRow,
} from "./donations-range";

const TODAY: CalendarDate = { year: 2026, month: 10, day: 8 };

describe("presetToRange", () => {
  it("convierte cada atajo usando una fecha fija como hoy", () => {
    expect(presetToRange("este-mes", TODAY)).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
    expect(presetToRange("mes-pasado", TODAY)).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(presetToRange("este-anio", TODAY)).toEqual({ desde: "2026-01-01", hasta: "2026-12-31" });
    expect(presetToRange("anio-pasado", TODAY)).toEqual({ desde: "2025-01-01", hasta: "2025-12-31" });
    expect(presetToRange("todo", TODAY)).toEqual({ desde: null, hasta: null });
  });

  it("el mes pasado de enero es diciembre del año anterior", () => {
    expect(presetToRange("mes-pasado", { year: 2026, month: 1, day: 15 })).toEqual({
      desde: "2025-12-01",
      hasta: "2025-12-31",
    });
  });

  it("respeta febrero en años bisiestos", () => {
    expect(monthRange(2028, 2)).toEqual({ desde: "2028-02-01", hasta: "2028-02-29" });
    expect(monthRange(2026, 2)).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
  });
});

describe("límites en hora de Colombia", () => {
  it("la medianoche de Colombia es las 05:00 UTC", () => {
    expect(colombiaStartOfDay({ year: 2026, month: 1, day: 1 }).toISOString()).toBe(
      "2026-01-01T05:00:00.000Z"
    );
  });

  it("calcula los límites UTC de un mes", () => {
    expect(rangeToUtcBounds(monthRange(2026, 1))).toEqual({
      gte: "2026-01-01T05:00:00.000Z",
      lt: "2026-02-01T05:00:00.000Z",
    });
  });

  it("calcula los límites UTC de un año", () => {
    expect(rangeToUtcBounds(yearRange(2026))).toEqual({
      gte: "2026-01-01T05:00:00.000Z",
      lt: "2027-01-01T05:00:00.000Z",
    });
  });

  it("deja abiertos los extremos sin fecha", () => {
    expect(rangeToUtcBounds({ desde: null, hasta: null })).toEqual({ gte: null, lt: null });
    expect(rangeToUtcBounds({ desde: "2026-03-10", hasta: null })).toEqual({
      gte: "2026-03-10T05:00:00.000Z",
      lt: null,
    });
  });

  it("una donación del 31 de enero a las 23:30 en Colombia pertenece a enero", () => {
    // 31/01/2026 23:30 en Colombia = 01/02/2026 04:30 UTC
    const createdAt = "2026-02-01T04:30:00.000Z";
    expect(toColombiaDate(new Date(createdAt))).toEqual({ year: 2026, month: 1, day: 31 });

    const january = rangeToUtcBounds(monthRange(2026, 1));
    expect(createdAt >= january.gte! && createdAt < january.lt!).toBe(true);

    const february = rangeToUtcBounds(monthRange(2026, 2));
    expect(createdAt >= february.gte!).toBe(false);

    const grouped = groupDonationsByPeriod(
      [{ amount: 10000, status: "verified", created_at: createdAt }],
      { desde: "2026-01-01", hasta: "2026-02-28" },
      TODAY
    );
    expect(grouped.periods.map((p) => [p.label, p.verifiedCount])).toEqual([
      ["Enero 2026", 1],
      ["Febrero 2026", 0],
    ]);
  });
});

describe("isValidIsoDate", () => {
  it("acepta solo AAAA-MM-DD con días reales", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-1-01")).toBe(false);
    expect(isValidIsoDate("01/02/2026")).toBe(false);
    expect(isValidIsoDate("2026-01-01T00:00")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });
});

describe("resolveDateFilter", () => {
  it("usa «Este año» por defecto", () => {
    const filter = resolveDateFilter({}, TODAY);
    expect(filter.preset).toBe("este-anio");
    expect(filter.range).toEqual({ desde: "2026-01-01", hasta: "2026-12-31" });
  });

  it("ignora un atajo inválido y vuelve al valor por defecto", () => {
    expect(resolveDateFilter({ periodo: "siempre" }, TODAY).preset).toBe("este-anio");
  });

  it("usa año y mes cuando vienen en la URL", () => {
    const filter = resolveDateFilter({ anio: "2025", mes: "3" }, TODAY);
    expect(filter.mode).toBe("anio");
    expect(filter.range).toEqual({ desde: "2025-03-01", hasta: "2025-03-31" });
    expect(filter.label).toBe("Marzo de 2025");
  });

  it("usa el año completo cuando el mes es «Todo el año» o inválido", () => {
    expect(resolveDateFilter({ anio: "2024" }, TODAY).range).toEqual(yearRange(2024));
    expect(resolveDateFilter({ anio: "2024", mes: "13" }, TODAY).range).toEqual(yearRange(2024));
  });

  it("da prioridad al rango libre y ordena las fechas invertidas", () => {
    const filter = resolveDateFilter(
      { periodo: "este-mes", anio: "2025", desde: "2026-05-10", hasta: "2026-02-01" },
      TODAY
    );
    expect(filter.mode).toBe("rango");
    expect(filter.range).toEqual({ desde: "2026-02-01", hasta: "2026-05-10" });
  });

  it("ignora fechas inválidas del rango libre", () => {
    const filter = resolveDateFilter({ desde: "2026-02-31", hasta: "abc" }, TODAY);
    expect(filter.mode).toBe("preset");
    expect(filter.preset).toBe("este-anio");
  });

  it("ofrece los últimos 5 años", () => {
    expect(getYearOptions(TODAY)).toEqual([2026, 2025, 2024, 2023, 2022]);
  });
});

describe("summarizeDonations y groupDonationsByPeriod", () => {
  const rows: DonationSummaryRow[] = [
    { amount: 50000, status: "verified", created_at: "2026-01-10T15:00:00Z" },
    { amount: "20000", status: "verified", created_at: "2026-03-02T15:00:00Z" },
    { amount: 10000, status: "pending", created_at: "2026-03-05T15:00:00Z" },
    { amount: 30000, status: "rejected", created_at: "2026-03-06T15:00:00Z" },
  ];

  it("solo suma como verificado lo que está verificado", () => {
    expect(summarizeDonations(rows)).toEqual({
      verifiedCount: 2,
      verifiedTotal: 70000,
      pendingCount: 1,
      pendingTotal: 10000,
      rejectedCount: 1,
      rejectedTotal: 30000,
    });
  });

  it("crea una fila por mes del rango, incluidos los meses vacíos", () => {
    const grouped = groupDonationsByPeriod(rows, { desde: "2026-01-01", hasta: "2026-03-31" }, TODAY);
    expect(grouped.granularity).toBe("month");
    expect(grouped.periods.map((p) => p.label)).toEqual(["Enero 2026", "Febrero 2026", "Marzo 2026"]);
    expect(grouped.periods[1].verifiedCount).toBe(0);
    expect(grouped.periods[2]).toMatchObject({
      verifiedCount: 1,
      verifiedTotal: 20000,
      pendingCount: 1,
      rejectedCount: 1,
    });
    expect(grouped.totals.verifiedTotal).toBe(70000);
  });

  it("agrupa por mes con 36 meses y por año cuando el rango pasa de 36", () => {
    const thirtySix = groupDonationsByPeriod([], { desde: "2024-01-01", hasta: "2026-12-31" }, TODAY);
    expect(thirtySix.granularity).toBe("month");
    expect(thirtySix.periods).toHaveLength(36);

    const thirtySeven = groupDonationsByPeriod(rows, { desde: "2023-12-01", hasta: "2026-12-31" }, TODAY);
    expect(thirtySeven.granularity).toBe("year");
    expect(thirtySeven.periods.map((p) => p.label)).toEqual(["2023", "2024", "2025", "2026"]);
    expect(thirtySeven.periods[3].verifiedTotal).toBe(70000);
  });

  it("con «Todo» usa desde la donación más antigua hasta hoy", () => {
    const grouped = groupDonationsByPeriod(rows, { desde: null, hasta: null }, TODAY);
    expect(grouped.periods[0].label).toBe("Enero 2026");
    expect(grouped.periods.at(-1)?.label).toBe("Octubre 2026");
  });

  it("con «Todo» y sin donaciones no muestra filas", () => {
    expect(groupDonationsByPeriod([], { desde: null, hasta: null }, TODAY).periods).toEqual([]);
  });
});

describe("fetchInBatches", () => {
  const makeSource = (total: number) => {
    const calls: Array<[number, number]> = [];
    const fetcher = async (from: number, to: number) => {
      calls.push([from, to]);
      const length = Math.max(0, Math.min(to, total - 1) - from + 1);
      return { data: Array.from({ length }, (_, i) => from + i), error: null };
    };
    return { calls, fetcher };
  };

  it("lee en lotes de 1000 hasta agotar los datos", async () => {
    const { calls, fetcher } = makeSource(2500);
    const result = await fetchInBatches(fetcher);
    expect(result.rows).toHaveLength(2500);
    expect(result.truncated).toBe(false);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("se detiene en el tope y avisa si quedan filas", async () => {
    const { fetcher } = makeSource(25);
    const result = await fetchInBatches(fetcher, { batchSize: 10, maxRows: 20 });
    expect(result.rows).toHaveLength(20);
    expect(result.truncated).toBe(true);
  });

  it("no marca tope si hay exactamente el máximo de filas", async () => {
    const { fetcher } = makeSource(20);
    const result = await fetchInBatches(fetcher, { batchSize: 10, maxRows: 20 });
    expect(result.rows).toHaveLength(20);
    expect(result.truncated).toBe(false);
  });

  it("devuelve el error de un lote", async () => {
    const result = await fetchInBatches(async () => ({ data: null, error: new Error("fallo") }));
    expect(result.error).toBeInstanceOf(Error);
  });
});
