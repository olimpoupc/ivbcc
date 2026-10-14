/**
 * Detección de cambios relevantes de un evento para avisar a los inscritos
 * (fecha/hora, lugar y cancelación). Puro: lo usan el editor del panel y la
 * Server Action que envía el aviso.
 */

import { formatEventDate } from "@/lib/event-calendar";

export type EventSnapshot = {
  event_date: string | null;
  location: string | null;
  status: string | null;
};

export type EventChangeField = "date" | "location" | "status";

export type EventChange = {
  field: EventChangeField;
  label: string;
  from: string;
  to: string;
};

const fieldLabels: Record<EventChangeField, string> = {
  date: "Fecha",
  location: "Lugar",
  status: "Estado",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  scheduled: "Programado",
  cancelled: "Cancelado",
};

/** Lugar sin espacios repetidos ni en los extremos. */
export function normalizeLocation(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function formatDateValue(value: string | null): string {
  return toTime(value) === null ? "Sin fecha" : formatEventDate(value as string);
}

export function isCancelled(snapshot: Pick<EventSnapshot, "status">): boolean {
  return snapshot.status === "cancelled";
}

/**
 * Cambios entre dos estados del evento. La fecha se compara por instante
 * (no por texto), el lugar sin diferencias de espacios, y el estado solo
 * cuenta si el evento pasa a cancelado o deja de estarlo.
 */
export function diffEventChanges(previous: EventSnapshot, current: EventSnapshot): EventChange[] {
  const changes: EventChange[] = [];

  if (toTime(previous.event_date) !== toTime(current.event_date)) {
    changes.push({
      field: "date",
      label: fieldLabels.date,
      from: formatDateValue(previous.event_date),
      to: formatDateValue(current.event_date),
    });
  }

  const fromLocation = normalizeLocation(previous.location);
  const toLocation = normalizeLocation(current.location);
  if (fromLocation !== toLocation) {
    changes.push({
      field: "location",
      label: fieldLabels.location,
      from: fromLocation || "Sin lugar",
      to: toLocation || "Sin lugar",
    });
  }

  if (isCancelled(previous) !== isCancelled(current)) {
    changes.push({
      field: "status",
      label: fieldLabels.status,
      from: statusLabels[previous.status || ""] || "Sin estado",
      to: statusLabels[current.status || ""] || "Sin estado",
    });
  }

  return changes;
}

/** "Fecha: A → B; Lugar: A → B" */
export function summarizeEventChanges(changes: EventChange[]): string {
  return changes.map((change) => `${change.label}: ${change.from} → ${change.to}`).join("; ");
}
