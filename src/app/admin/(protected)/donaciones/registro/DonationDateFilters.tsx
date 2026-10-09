import Link from "next/link";
import { buildListHref } from "@/lib/admin-query";
import {
  DATE_PRESETS,
  MONTH_NAMES,
  type ResolvedDateFilter,
} from "@/lib/donations-range";

type Props = {
  pathname: string;
  filter: ResolvedDateFilter;
  yearOptions: number[];
  query: string;
  status: string;
};

const chipBase =
  "rounded-full border px-4 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]/40";
const fieldClass =
  "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-[var(--ivbcc-gold)] focus:outline-none";
const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1";

/**
 * Filtros por fecha del registro. Todo vive en la URL: los atajos son enlaces
 * y los selectores son formularios GET, así funcionan sin JavaScript y se
 * pueden compartir o recargar sin perder el filtro.
 */
export default function DonationDateFilters({ pathname, filter, yearOptions, query, status }: Props) {
  const keep = { q: query || undefined, status: status !== "all" ? status : undefined };
  const selectedYear = filter.year ?? yearOptions[0];

  return (
    <section
      aria-label="Filtrar por fecha"
      className="premium-surface rounded-[24px] p-5 space-y-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => {
            const isActive = filter.mode === "preset" && filter.preset === preset.value;
            return (
              <Link
                key={preset.value}
                href={buildListHref(pathname, { ...keep, periodo: preset.value })}
                aria-current={isActive ? "true" : undefined}
                className={`${chipBase} ${
                  isActive
                    ? "border-[var(--ivbcc-navy)] bg-[var(--ivbcc-navy)] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>

        <Link
          href={pathname}
          className="text-xs font-bold text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
        >
          Limpiar filtros
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form method="get" action={pathname} className="flex flex-wrap items-end gap-2">
          {keep.q && <input type="hidden" name="q" value={keep.q} />}
          {keep.status && <input type="hidden" name="status" value={keep.status} />}
          <div>
            <label htmlFor="filtro-anio" className={labelClass}>
              Año
            </label>
            <select id="filtro-anio" name="anio" defaultValue={selectedYear} className={fieldClass}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-mes" className={labelClass}>
              Mes
            </label>
            <select
              id="filtro-mes"
              name="mes"
              defaultValue={filter.month ? String(filter.month) : ""}
              className={`${fieldClass} capitalize`}
            >
              <option value="">Todo el año</option>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary rounded-full px-4 py-2 text-xs font-bold">
            Aplicar
          </button>
        </form>

        <form method="get" action={pathname} className="flex flex-wrap items-end gap-2">
          {keep.q && <input type="hidden" name="q" value={keep.q} />}
          {keep.status && <input type="hidden" name="status" value={keep.status} />}
          <div>
            <label htmlFor="filtro-desde" className={labelClass}>
              Desde
            </label>
            <input
              id="filtro-desde"
              type="date"
              name="desde"
              defaultValue={filter.mode === "rango" ? filter.range.desde || "" : ""}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="filtro-hasta" className={labelClass}>
              Hasta
            </label>
            <input
              id="filtro-hasta"
              type="date"
              name="hasta"
              defaultValue={filter.mode === "rango" ? filter.range.hasta || "" : ""}
              className={fieldClass}
            />
          </div>
          <button type="submit" className="btn-primary rounded-full px-4 py-2 text-xs font-bold">
            Aplicar rango
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-500">
        Periodo: <strong className="text-slate-800">{filter.label}</strong>
        {filter.mode === "preset" && filter.range.desde && filter.range.hasta && (
          <> ({filter.range.desde} a {filter.range.hasta})</>
        )}
        . Fechas en hora de Colombia.
      </p>
    </section>
  );
}
