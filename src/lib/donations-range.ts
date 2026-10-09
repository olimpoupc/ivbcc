/**
 * Utilidades puras para filtrar y resumir donaciones por fecha en hora de
 * Colombia (America/Bogota, UTC-5, sin horario de verano).
 *
 * Seguro para el navegador y para pruebas: NO importa nada de Node.js ni del
 * servidor. Todas las funciones reciben "hoy" como parámetro para que el
 * resultado sea determinista.
 */

// Colombia no usa horario de verano: la medianoche local siempre es 05:00 UTC.
export const COLOMBIA_OFFSET_HOURS = 5;
const COLOMBIA_OFFSET_MS = COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000;

export const SUMMARY_BATCH_SIZE = 1000;
export const SUMMARY_MAX_ROWS = 20000;
export const MAX_MONTHLY_BUCKETS = 36;
export const YEAR_OPTIONS_COUNT = 5;

export const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export type DatePreset = "este-mes" | "mes-pasado" | "este-anio" | "anio-pasado" | "todo";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "este-mes", label: "Este mes" },
  { value: "mes-pasado", label: "Mes pasado" },
  { value: "este-anio", label: "Este año" },
  { value: "anio-pasado", label: "Año pasado" },
  { value: "todo", label: "Todo" },
];

export const DEFAULT_PRESET: DatePreset = "este-anio";

/** Fecha de calendario (mes de 1 a 12). */
export type CalendarDate = { year: number; month: number; day: number };

/** Rango de días locales inclusivo en formato AAAA-MM-DD; null = abierto. */
export type DateRange = { desde: string | null; hasta: string | null };

const pad = (value: number, size = 2) => String(value).padStart(size, "0");

export function formatIsoDate({ year, month, day }: CalendarDate): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Valida estrictamente AAAA-MM-DD y que el día exista. */
export function parseIsoDate(value: string | null | undefined): CalendarDate | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return { year, month, day };
}

export function isValidIsoDate(value: string | null | undefined): value is string {
  return parseIsoDate(value) !== null;
}

/** Día de calendario en Colombia al que pertenece un instante. */
export function toColombiaDate(instant: Date): CalendarDate {
  const shifted = new Date(instant.getTime() - COLOMBIA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Instante UTC en que empieza (00:00 hora Colombia) el día indicado. */
export function colombiaStartOfDay({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day, COLOMBIA_OFFSET_HOURS));
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function monthRange(year: number, month: number): DateRange {
  return {
    desde: formatIsoDate({ year, month, day: 1 }),
    hasta: formatIsoDate({ year, month, day: daysInMonth(year, month) }),
  };
}

export function yearRange(year: number): DateRange {
  return {
    desde: formatIsoDate({ year, month: 1, day: 1 }),
    hasta: formatIsoDate({ year, month: 12, day: 31 }),
  };
}

export function presetToRange(preset: DatePreset, today: CalendarDate): DateRange {
  switch (preset) {
    case "este-mes":
      return monthRange(today.year, today.month);
    case "mes-pasado":
      return today.month === 1
        ? monthRange(today.year - 1, 12)
        : monthRange(today.year, today.month - 1);
    case "este-anio":
      return yearRange(today.year);
    case "anio-pasado":
      return yearRange(today.year - 1);
    case "todo":
      return { desde: null, hasta: null };
  }
}

/**
 * Convierte un rango de días locales en límites UTC para filtrar created_at:
 * created_at >= gte  y  created_at < lt  (lt es la medianoche del día
 * siguiente a "hasta", así se incluye todo el último día).
 */
export function rangeToUtcBounds(range: DateRange): { gte: string | null; lt: string | null } {
  const desde = parseIsoDate(range.desde);
  const hasta = parseIsoDate(range.hasta);
  return {
    gte: desde ? colombiaStartOfDay(desde).toISOString() : null,
    lt: hasta ? colombiaStartOfDay(addDays(hasta, 1)).toISOString() : null,
  };
}

export function getYearOptions(today: CalendarDate, count = YEAR_OPTIONS_COUNT): number[] {
  return Array.from({ length: count }, (_, index) => today.year - index);
}

export type DateFilterParams = {
  periodo?: string | null;
  anio?: string | null;
  mes?: string | null;
  desde?: string | null;
  hasta?: string | null;
};

export type ResolvedDateFilter = {
  mode: "preset" | "anio" | "rango";
  preset: DatePreset | null;
  year: number | null;
  month: number | null;
  range: DateRange;
  label: string;
};

function isPreset(value: string | null | undefined): value is DatePreset {
  return DATE_PRESETS.some((preset) => preset.value === value);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDisplayDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  return `${date.day} de ${MONTH_NAMES[date.month - 1]} de ${date.year}`;
}

/**
 * Decide el rango a partir de los parámetros de la URL. Prioridad:
 * 1) rango libre (desde/hasta válidos), 2) año (+ mes opcional),
 * 3) atajo, 4) por defecto "Este año". Los valores inválidos se ignoran.
 */
export function resolveDateFilter(
  params: DateFilterParams,
  today: CalendarDate
): ResolvedDateFilter {
  let desde = isValidIsoDate(params.desde) ? params.desde : null;
  let hasta = isValidIsoDate(params.hasta) ? params.hasta : null;

  if (desde || hasta) {
    if (desde && hasta && desde > hasta) [desde, hasta] = [hasta, desde];
    const label =
      desde && hasta
        ? `Del ${formatDisplayDate(desde)} al ${formatDisplayDate(hasta)}`
        : desde
          ? `Desde el ${formatDisplayDate(desde)}`
          : `Hasta el ${formatDisplayDate(hasta as string)}`;
    return { mode: "rango", preset: null, year: null, month: null, range: { desde, hasta }, label };
  }

  const year = Number(params.anio);
  if (/^\d{4}$/.test(params.anio || "") && year >= 2000 && year <= today.year + 1) {
    const month = Number(params.mes);
    if (/^\d{1,2}$/.test(params.mes || "") && month >= 1 && month <= 12) {
      return {
        mode: "anio",
        preset: null,
        year,
        month,
        range: monthRange(year, month),
        label: `${capitalize(MONTH_NAMES[month - 1])} de ${year}`,
      };
    }
    return { mode: "anio", preset: null, year, month: null, range: yearRange(year), label: `Año ${year}` };
  }

  const preset = isPreset(params.periodo) ? params.periodo : DEFAULT_PRESET;
  const presetLabel = DATE_PRESETS.find((option) => option.value === preset)?.label || "";
  return {
    mode: "preset",
    preset,
    year: null,
    month: null,
    range: presetToRange(preset, today),
    label: preset === "todo" ? "Todas las fechas" : presetLabel,
  };
}

// ---------------------------------------------------------------------------
// Totales y resumen por periodo
// ---------------------------------------------------------------------------

export type DonationSummaryRow = {
  amount: number | string;
  status: string;
  created_at: string;
};

export type DonationTotals = {
  verifiedCount: number;
  verifiedTotal: number;
  pendingCount: number;
  pendingTotal: number;
  rejectedCount: number;
  rejectedTotal: number;
};

export type PeriodSummary = DonationTotals & {
  key: string;
  label: string;
};

export type GroupedSummary = {
  granularity: "month" | "year";
  periods: PeriodSummary[];
  totals: DonationTotals;
};

export function emptyTotals(): DonationTotals {
  return {
    verifiedCount: 0,
    verifiedTotal: 0,
    pendingCount: 0,
    pendingTotal: 0,
    rejectedCount: 0,
    rejectedTotal: 0,
  };
}

function addToTotals(totals: DonationTotals, row: DonationSummaryRow) {
  const amount = Number(row.amount) || 0;
  if (row.status === "verified") {
    totals.verifiedCount += 1;
    totals.verifiedTotal += amount;
  } else if (row.status === "pending") {
    totals.pendingCount += 1;
    totals.pendingTotal += amount;
  } else if (row.status === "rejected") {
    totals.rejectedCount += 1;
    totals.rejectedTotal += amount;
  }
}

export function summarizeDonations(rows: DonationSummaryRow[]): DonationTotals {
  const totals = emptyTotals();
  for (const row of rows) addToTotals(totals, row);
  return totals;
}

const monthIndex = (date: { year: number; month: number }) => date.year * 12 + (date.month - 1);

export function countMonths(
  start: { year: number; month: number },
  end: { year: number; month: number }
): number {
  return monthIndex(end) - monthIndex(start) + 1;
}

/**
 * Agrupa por mes (hora Colombia) con una fila por cada mes del rango, incluso
 * si no tuvo donaciones. Si el rango supera 36 meses agrupa por año.
 * Los extremos abiertos del rango se completan con la donación más antigua
 * (desde) y con "hoy" (hasta).
 */
export function groupDonationsByPeriod(
  rows: DonationSummaryRow[],
  range: DateRange,
  today: CalendarDate
): GroupedSummary {
  const totals = summarizeDonations(rows);
  const rowDates = rows.map((row) => toColombiaDate(new Date(row.created_at)));

  let start = parseIsoDate(range.desde);
  let end = parseIsoDate(range.hasta);

  if (!start) {
    if (rowDates.length === 0) return { granularity: "month", periods: [], totals };
    start = rowDates.reduce((min, date) => (monthIndex(date) < monthIndex(min) ? date : min));
  }
  if (!end) {
    const latest = rowDates.reduce(
      (max, date) => (monthIndex(date) > monthIndex(max) ? date : max),
      today
    );
    end = latest;
  }
  if (monthIndex(end) < monthIndex(start)) return { granularity: "month", periods: [], totals };

  const granularity = countMonths(start, end) > MAX_MONTHLY_BUCKETS ? "year" : "month";
  const periods: PeriodSummary[] = [];
  const byKey = new Map<string, PeriodSummary>();

  if (granularity === "month") {
    for (let index = monthIndex(start); index <= monthIndex(end); index += 1) {
      const year = Math.floor(index / 12);
      const month = (index % 12) + 1;
      const period = {
        key: `${year}-${pad(month)}`,
        label: `${capitalize(MONTH_NAMES[month - 1])} ${year}`,
        ...emptyTotals(),
      };
      periods.push(period);
      byKey.set(period.key, period);
    }
  } else {
    for (let year = start.year; year <= end.year; year += 1) {
      const period = { key: String(year), label: String(year), ...emptyTotals() };
      periods.push(period);
      byKey.set(period.key, period);
    }
  }

  rows.forEach((row, index) => {
    const date = rowDates[index];
    const key = granularity === "month" ? `${date.year}-${pad(date.month)}` : String(date.year);
    const period = byKey.get(key);
    if (period) addToTotals(period, row);
  });

  return { granularity, periods, totals };
}

// ---------------------------------------------------------------------------
// Lectura por lotes
// ---------------------------------------------------------------------------

export type BatchFetcher<T> = (
  from: number,
  to: number
) => PromiseLike<{ data: T[] | null; error: unknown }>;

export type BatchResult<T> = {
  rows: T[];
  error: unknown;
  /** true si se alcanzó el tope y pueden existir más filas sin leer. */
  truncated: boolean;
};

/** Lee filas en lotes (por defecto de 1000) hasta agotar los datos o llegar al tope. */
export async function fetchInBatches<T>(
  fetchBatch: BatchFetcher<T>,
  { batchSize = SUMMARY_BATCH_SIZE, maxRows = SUMMARY_MAX_ROWS } = {}
): Promise<BatchResult<T>> {
  const rows: T[] = [];

  while (rows.length < maxRows) {
    const from = rows.length;
    const to = Math.min(from + batchSize, maxRows) - 1;
    const { data, error } = await fetchBatch(from, to);
    if (error) return { rows, error, truncated: false };

    const batch = data || [];
    rows.push(...batch);
    if (batch.length < to - from + 1) return { rows, error: null, truncated: false };
  }

  // Tope alcanzado: comprobamos si queda al menos una fila más.
  const { data } = await fetchBatch(maxRows, maxRows);
  return { rows, error: null, truncated: Boolean(data && data.length > 0) };
}
