import { buildCsvContent } from "@/lib/csv";
import { getRegistrationStatusLabel } from "@/lib/registration-status";

export type RegistrationCsvRow = {
  full_name: string;
  email: string;
  phone?: string | null;
  created_at?: string | null;
  status?: string | null;
  checked_in_at?: string | null;
};

export const REGISTRATIONS_CSV_HEADERS = ["Nombre", "Correo", "Telefono", "Fecha", "Estado", "Asistencia"];

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

/**
 * CSV de inscritos de un evento. Los nombres los escribe el visitante, así
 * que se reutiliza buildCsvContent (src/lib/csv.ts) para neutralizar fórmulas
 * como =HYPERLINK(...) antes de que el administrador abra el archivo en Excel.
 */
export function buildRegistrationsCsvContent(registrations: RegistrationCsvRow[]) {
  return buildCsvContent(
    REGISTRATIONS_CSV_HEADERS,
    registrations.map((registration) => [
      registration.full_name,
      registration.email,
      registration.phone || "",
      formatDateTimeColombia(registration.created_at),
      getRegistrationStatusLabel(registration.status),
      registration.checked_in_at
        ? `Asistió (${formatDateTimeColombia(registration.checked_in_at)})`
        : "No registrada",
    ])
  );
}
