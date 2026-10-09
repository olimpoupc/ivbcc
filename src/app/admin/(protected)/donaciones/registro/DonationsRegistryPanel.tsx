"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AdminPagination,
  AdminStatusBadge,
  AdminEmptyState,
} from "@/components/admin/AdminPrimitives";
import { buildListHref } from "@/lib/admin-query";
import { formatColombianPesos } from "@/lib/donations-format";
import {
  verifyDonation,
  rejectDonation,
  revertDonationToPending,
  getReceiptSignedUrl,
} from "./actions";

export type DonationRow = {
  id: string;
  reference_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  amount: number;
  method_title: string;
  receipt_path: string | null;
  status: "pending" | "verified" | "rejected";
  admin_note: string | null;
  verified_at: string | null;
  created_at: string;
};

type Props = {
  initialDonations: DonationRow[];
  query: string;
  status: string;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  /** Filtros de fecha de la URL que la paginación debe conservar. */
  listParams: Record<string, string | undefined>;
  /** Enlace de exportación con el mismo rango, estado y búsqueda. */
  exportHref: string;
};

type ActionType = "verify" | "reject" | "revert";

const statusFilterOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendientes" },
  { value: "verified", label: "Verificadas" },
  { value: "rejected", label: "Rechazadas" },
];

function formatDateColombia(isoString: string) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Bogota",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export default function DonationsRegistryPanel({
  initialDonations,
  query,
  status,
  page,
  totalPages,
  totalItems,
  pageSize,
  listParams,
  exportHref,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState(query);
  const [isPending, startTransition] = useTransition();

  // Estado para modal/diálogo de acción (verificar / rechazar)
  const [actionModal, setActionModal] = useState<{
    type: ActionType;
    donation: DonationRow;
  } | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Estado de carga de URL firmada
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const updateSearchAndFilters = (newQuery: string, newStatus: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (newQuery) {
      params.set("q", newQuery);
    } else {
      params.delete("q");
    }
    if (newStatus && newStatus !== "all") {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchAndFilters(searchText.trim(), status);
  };

  const handleStatusChange = (newStatus: string) => {
    updateSearchAndFilters(query, newStatus);
  };

  const handleOpenReceipt = async (donation: DonationRow) => {
    if (!donation.receipt_path) return;
    setLoadingReceiptId(donation.id);
    try {
      const res = await getReceiptSignedUrl(donation.receipt_path);
      if (res.success && res.signedUrl) {
        window.open(res.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        alert(res.error || "No fue posible abrir el comprobante.");
      }
    } catch {
      alert("Error al solicitar el enlace seguro del comprobante.");
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const handleConfirmAction = () => {
    if (!actionModal) return;
    setActionError(null);

    startTransition(async () => {
      const { type, donation } = actionModal;
      try {
        const res =
          type === "verify"
            ? await verifyDonation(donation.id, adminNoteInput)
            : type === "reject"
              ? await rejectDonation(donation.id, adminNoteInput)
              : await revertDonationToPending(donation.id);

        if (!res.success) {
          setActionError(res.error || "Error al procesar la acción.");
          return;
        }
      } catch {
        setActionError("No hubo conexión con el servidor. Revisa tu internet e inténtalo de nuevo.");
        return;
      }

      setActionModal(null);
      setAdminNoteInput("");
    });
  };

  const openActionModal = (type: ActionType, donation: DonationRow) => {
    setActionError(null);
    setAdminNoteInput(donation.admin_note || "");
    setActionModal({ type, donation });
  };

  const closeActionModal = () => {
    if (isPending) return;
    setActionModal(null);
    setActionError(null);
  };

  return (
    <div className="space-y-6">
      {/* Barra de herramientas: Búsqueda, Filtro y Exportar */}
      <div className="premium-surface rounded-[24px] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full md:w-auto items-center gap-2 flex-1 max-w-md"
        >
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre o referencia (ej. DON-2026)..."
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--ivbcc-gold)] focus:outline-none"
          />
          <button
            type="submit"
            className="btn-primary rounded-full px-4 py-2 text-xs font-bold shrink-0"
          >
            Buscar
          </button>
        </form>

        <div className="flex w-full md:w-auto items-center gap-3 justify-end flex-wrap">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label="Filtrar por estado"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <a
            href={exportHref}
            download
            className="btn-ghost rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 flex items-center gap-2"
          >
            <span>Exportar CSV</span>
          </a>
        </div>
      </div>

      {/* Listado de donaciones */}
      {initialDonations.length === 0 ? (
        <AdminEmptyState
          title="No se encontraron donaciones"
          description="No hay donaciones en este periodo con los filtros elegidos. Prueba con otro rango de fechas, otro estado o «Limpiar filtros»."
        />
      ) : (
        <div className="premium-surface overflow-hidden rounded-[24px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4">Donante</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Comprobante</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialDonations.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateColombia(d.created_at)}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                      {d.reference_code}
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 text-sm">
                        {d.first_name} {d.last_name}
                      </p>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        {d.email && <p className="truncate max-w-[200px]">{d.email}</p>}
                        {d.phone && <p>{d.phone}</p>}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {d.method_title}
                    </td>

                    <td className="py-4 px-4 text-right font-black text-slate-950 whitespace-nowrap">
                      {formatColombianPesos(d.amount)}
                    </td>

                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {d.status === "verified" ? (
                        <AdminStatusBadge tone="green">Verificada</AdminStatusBadge>
                      ) : d.status === "rejected" ? (
                        <AdminStatusBadge tone="red">Rechazada</AdminStatusBadge>
                      ) : (
                        <AdminStatusBadge tone="amber">Pendiente</AdminStatusBadge>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {d.receipt_path ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(d)}
                          disabled={loadingReceiptId === d.id}
                          className="btn-ghost text-xs px-3 py-1 font-bold text-blue-700 hover:text-blue-900 border border-blue-200 bg-blue-50/60 rounded-full"
                        >
                          {loadingReceiptId === d.id ? "Cargando..." : "Ver archivo ↗"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Sin archivo</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {d.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openActionModal("verify", d)}
                              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                            >
                              Verificar
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal("reject", d)}
                              className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 transition"
                            >
                              Rechazar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openActionModal("revert", d)}
                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                          >
                            Volver a pendiente
                          </button>
                        )}
                      </div>
                      {d.admin_note && (
                        <p
                          className="mt-1 ml-auto max-w-[220px] truncate text-right text-[11px] text-slate-400"
                          title={d.admin_note}
                        >
                          Nota: {d.admin_note}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[var(--ivbcc-line)]">
            <AdminPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              buildHref={(newPage) =>
                buildListHref(pathname, {
                  ...listParams,
                  q: query,
                  status: status !== "all" ? status : undefined,
                  page: String(newPage),
                })
              }
            />
          </div>
        </div>
      )}

      {/* Diálogo de confirmación: Verificar / Rechazar / Volver a pendiente */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="donation-action-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeActionModal();
          }}
        >
          <div className="premium-surface w-full max-w-md rounded-[28px] p-6 shadow-2xl space-y-4">
            <h3 id="donation-action-title" className="section-title text-xl text-slate-950">
              {actionModal.type === "verify"
                ? "Verificar donación"
                : actionModal.type === "reject"
                  ? "Rechazar donación"
                  : "Volver a pendiente"}
            </h3>

            {actionModal.type === "verify" ? (
              <p className="text-base font-semibold text-slate-800">
                ¿Confirmas que ya llegó la transferencia de{" "}
                <strong className="font-black text-slate-950">
                  {formatColombianPesos(actionModal.donation.amount)}
                </strong>
                ? Se sumará a los totales.
              </p>
            ) : actionModal.type === "reject" ? (
              <p className="text-sm text-slate-600">
                ¿Confirmas que la transferencia de{" "}
                <strong className="text-slate-900">
                  {formatColombianPesos(actionModal.donation.amount)}
                </strong>{" "}
                no llegó o no coincide? Quedará como rechazada y no sumará a los totales.
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                ¿Devolver esta donación de{" "}
                <strong className="text-slate-900">
                  {formatColombianPesos(actionModal.donation.amount)}
                </strong>{" "}
                a pendiente? Úsalo solo si hubo un error.{" "}
                {actionModal.donation.status === "verified"
                  ? "Dejará de sumar a los totales verificados."
                  : "Volverá a la lista de pendientes por revisar."}
              </p>
            )}

            <p className="text-xs text-slate-500">
              <span className="font-mono font-bold text-slate-700">
                {actionModal.donation.reference_code}
              </span>{" "}
              · {actionModal.donation.first_name} {actionModal.donation.last_name} ·{" "}
              {actionModal.donation.method_title}
            </p>

            {actionError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
              >
                {actionError}
              </div>
            )}

            {actionModal.type !== "revert" && (
              <div>
                <label htmlFor="admin-note-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nota administrativa (Opcional):
                </label>
                <textarea
                  id="admin-note-input"
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Observación o comprobante de conciliación..."
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]/20"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeActionModal}
                disabled={isPending}
                className="btn-ghost text-xs px-4 py-2 font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmAction}
                className={`rounded-full px-5 py-2 text-xs font-black text-white shadow transition disabled:opacity-60 ${
                  actionModal.type === "verify"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : actionModal.type === "reject"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[var(--ivbcc-navy)] hover:opacity-90"
                }`}
              >
                {isPending
                  ? "Procesando..."
                  : actionModal.type === "verify"
                    ? "Sí"
                    : actionModal.type === "reject"
                      ? "Sí, rechazar"
                      : "Sí, volver a pendiente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
