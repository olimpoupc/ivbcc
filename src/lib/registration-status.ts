export const REGISTRATION_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export type RegistrationStatusFilter = RegistrationStatus | "all";

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

export const registrationStatusFilters: { value: RegistrationStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "pending", label: "Pendientes" },
  { value: "cancelled", label: "Canceladas" },
];

export function parseRegistrationStatus(value: string | null | undefined): RegistrationStatusFilter {
  return (REGISTRATION_STATUSES as readonly string[]).includes(value || "")
    ? (value as RegistrationStatus)
    : "all";
}

export function getRegistrationStatusLabel(value: string | null | undefined): string {
  return registrationStatusLabels[value as RegistrationStatus] || "Sin estado";
}
