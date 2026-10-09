import { quoteFilterValue } from "@/lib/admin-query";
import { rangeToUtcBounds, type DateRange } from "@/lib/donations-range";

export const DONATION_STATUSES = ["pending", "verified", "rejected"] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];
export type DonationStatusFilter = DonationStatus | "all";

export function parseDonationStatus(value: string | null | undefined): DonationStatusFilter {
  return (DONATION_STATUSES as readonly string[]).includes(value || "")
    ? (value as DonationStatus)
    : "all";
}

export type DonationFilters = {
  status: DonationStatusFilter;
  query: string;
  range: DateRange;
};

export type DonationFilterParts = {
  status: DonationStatus | null;
  orFilter: string | null;
  gte: string | null;
  lt: string | null;
};

/**
 * Traduce los filtros (estado, búsqueda y rango de fechas en hora Colombia)
 * a las piezas que cada consulta aplica con .eq/.or/.gte/.lt sobre created_at.
 * Se usa igual en la página del registro y en la exportación CSV.
 */
export function getDonationFilterParts({ status, query, range }: DonationFilters): DonationFilterParts {
  const likeValue = query ? quoteFilterValue(`%${query}%`) : null;
  const { gte, lt } = rangeToUtcBounds(range);

  return {
    status: status === "all" ? null : status,
    orFilter: likeValue
      ? `first_name.ilike.${likeValue},last_name.ilike.${likeValue},reference_code.ilike.${likeValue},method_title.ilike.${likeValue}`
      : null,
    gte,
    lt,
  };
}
