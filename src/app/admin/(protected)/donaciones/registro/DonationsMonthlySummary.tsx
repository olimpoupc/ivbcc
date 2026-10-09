import { formatColombianPesos } from "@/lib/donations-format";
import type { GroupedSummary } from "@/lib/donations-range";

type Props = {
  summary: GroupedSummary;
};

export default function DonationsMonthlySummary({ summary }: Props) {
  const { granularity, periods, totals } = summary;
  const title = granularity === "month" ? "Resumen por mes" : "Resumen por año";

  return (
    <section className="premium-surface overflow-hidden rounded-[24px]">
      <div className="px-5 pt-5">
        <h2 className="section-title text-xl text-slate-950">{title}</h2>
        {granularity === "year" && (
          <p className="mt-1 text-xs text-slate-500">
            El periodo elegido pasa de 36 meses, por eso se agrupa por año.
          </p>
        )}
      </div>

      {periods.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No hay donaciones en este periodo.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="border-y border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
              <tr>
                <th scope="col" className="py-3 px-4">
                  {granularity === "month" ? "Mes" : "Año"}
                </th>
                <th scope="col" className="py-3 px-4 text-right">Verificadas</th>
                <th scope="col" className="py-3 px-4 text-right">Total verificado</th>
                <th scope="col" className="py-3 px-4 text-right">Pendientes</th>
                <th scope="col" className="py-3 px-4 text-right">Rechazadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((period) => (
                <tr key={period.key}>
                  <th scope="row" className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {period.label}
                  </th>
                  <td className="py-3 px-4 text-right">{period.verifiedCount}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-950 whitespace-nowrap">
                    {formatColombianPesos(period.verifiedTotal)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {period.pendingCount}
                    {period.pendingCount > 0 && (
                      <span className="block text-xs text-slate-500">
                        {formatColombianPesos(period.pendingTotal)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">{period.rejectedCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] font-black text-slate-950">
              <tr>
                <th scope="row" className="py-3 px-4">Total</th>
                <td className="py-3 px-4 text-right">{totals.verifiedCount}</td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  {formatColombianPesos(totals.verifiedTotal)}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  {totals.pendingCount}
                  {totals.pendingCount > 0 && (
                    <span className="block text-xs font-bold text-slate-500">
                      {formatColombianPesos(totals.pendingTotal)}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">{totals.rejectedCount}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
