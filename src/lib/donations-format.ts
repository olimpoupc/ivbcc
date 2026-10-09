/**
 * Utilidades puras de formateo y validación de montos para donaciones.
 * Seguro para el navegador: NO tiene dependencias de Node.js ni "node:crypto".
 * Puede importarse libremente en componentes de cliente y de servidor.
 */

export const MIN_DONATION_AMOUNT = 1000;
export const MAX_DONATION_AMOUNT = 20000000;
export const QUICK_AMOUNTS = [10000, 20000, 50000, 100000] as const;

export type ValidateDonationAmountResult = {
  valid: boolean;
  error?: string;
  amount?: number;
};

export function formatColombianPesos(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function validateDonationAmount(
  amount: unknown
): ValidateDonationAmountResult {
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    return {
      valid: false,
      error: "El monto debe ser un número entero en pesos colombianos.",
    };
  }

  if (amount < MIN_DONATION_AMOUNT || amount > MAX_DONATION_AMOUNT) {
    return {
      valid: false,
      error: `El monto debe estar entre ${formatColombianPesos(MIN_DONATION_AMOUNT)} y ${formatColombianPesos(MAX_DONATION_AMOUNT)}.`,
    };
  }

  return { valid: true, amount };
}
