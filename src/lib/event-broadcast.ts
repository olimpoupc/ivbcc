/**
 * Lógica pura de los mensajes a inscritos de un evento (sin dependencias de
 * servidor): destinatarios, tope diario y lotes.
 */

/**
 * Tope diario del plan GRATUITO de Resend: "daily email quota of 100
 * emails/day and 3,000 emails/month" (se reinicia a medianoche UTC).
 * Fuente: https://resend.com/docs/knowledge-base/account-quotas-and-limits
 * (consultada el 2026-10-14). Los planes Pro y Scale no tienen tope diario:
 * si la IVBCC usa uno de ellos, ajustar esta constante.
 */
export const RESEND_DAILY_QUOTA = 100;

/** Batch Email API: hasta 100 correos por llamada (misma fuente). */
export const RESEND_BATCH_SIZE = 100;

export const BROADCAST_SUBJECT_MAX = 200;
export const BROADCAST_BODY_MAX = 10000;

export type BroadcastCandidate = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  marketing_consent: boolean;
};

/**
 * Destinatarios = status 'confirmed' AND marketing_consent AND correo NO
 * suprimido (comparado en minúscula). Un correo aparece una sola vez.
 */
export function selectBroadcastRecipients(
  registrations: BroadcastCandidate[],
  suppressedEmails: Iterable<string>
): BroadcastCandidate[] {
  const suppressed = new Set(Array.from(suppressedEmails, (email) => email.trim().toLowerCase()));
  const seen = new Set<string>();
  const recipients: BroadcastCandidate[] = [];

  for (const registration of registrations) {
    const email = registration.email.trim().toLowerCase();
    if (registration.status !== "confirmed") continue;
    if (!registration.marketing_consent) continue;
    if (suppressed.has(email) || seen.has(email)) continue;
    seen.add(email);
    recipients.push(registration);
  }

  return recipients;
}

/** Inicio del día UTC (el tope diario de Resend se reinicia a medianoche UTC). */
export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function checkDailyQuota(
  alreadySentToday: number,
  recipients: number,
  quota: number = RESEND_DAILY_QUOTA
) {
  const remaining = Math.max(0, quota - alreadySentToday);
  return { remaining, exceeds: recipients > remaining };
}

export function chunk<T>(items: T[], size: number = RESEND_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function validateBroadcastInput(subject: string, body: string): string | null {
  const cleanSubject = subject.trim();
  const cleanBody = body.trim();
  if (!cleanSubject) return "Escribe el asunto del mensaje.";
  if (cleanSubject.length > BROADCAST_SUBJECT_MAX) {
    return `El asunto no debe superar ${BROADCAST_SUBJECT_MAX} caracteres.`;
  }
  if (!cleanBody) return "Escribe el contenido del mensaje.";
  if (cleanBody.length > BROADCAST_BODY_MAX) {
    return `El mensaje no debe superar ${BROADCAST_BODY_MAX} caracteres.`;
  }
  return null;
}
