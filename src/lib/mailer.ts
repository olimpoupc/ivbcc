/**
 * SERVER-ONLY: envío de correos transaccionales con Resend.
 *
 * Variables (solo nombres): RESEND_API_KEY y, como remitente,
 * EVENTS_FROM_EMAIL (opcional) o CONTACT_FROM_EMAIL. CONTACT_REPLY_TO_EMAIL
 * es opcional. Nunca lanza: devuelve el resultado para que el llamador decida
 * (una inscripción no debe perderse porque falle el correo).
 */

import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "not_configured" | "provider_error" | "exception" };

export function getMailerConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EVENTS_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL;
  return apiKey && from ? { apiKey, from } : null;
}

export async function sendEmail(input: SendEmailInput, context: string): Promise<SendEmailResult> {
  const config = getMailerConfig();
  if (!config) {
    console.error(
      `[correo] ${context}: no se envió; falta RESEND_API_KEY o EVENTS_FROM_EMAIL/CONTACT_FROM_EMAIL.`
    );
    return { ok: false, reason: "not_configured" };
  }

  try {
    const resend = new Resend(config.apiKey);
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: input.to,
      replyTo: process.env.CONTACT_REPLY_TO_EMAIL || undefined,
      subject: input.subject,
      html: input.html,
      headers: input.headers,
    });

    if (error) {
      console.error(`[correo] ${context}: Resend rechazó el envío:`, error);
      return { ok: false, reason: "provider_error" };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error(`[correo] ${context}: error al enviar:`, error);
    return { ok: false, reason: "exception" };
  }
}
