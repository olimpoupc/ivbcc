"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { trackEvent } from "@/lib/analytics";
import { maskEmail } from "@/lib/mask-email";
import { isClientRateLimited, sanitizeText } from "@/lib/security";
import FormField from "@/components/ui/FormField";
import {
  registerForEvent,
  type RegisterForEventInput,
  type RegisterForEventResult,
} from "./actions";

type Props = {
  eventId: string;
};

type DoneInfo = { maskedEmail: string; at: string };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

// En localStorage (por evento) se guarda SOLO el correo enmascarado y la
// fecha: nunca el correo completo ni el token.
const storageKey = (eventId: string) => `ivbcc:inscripcion-evento:${eventId}`;

function readDoneSnapshot(eventId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(eventId));
  } catch {
    return null;
  }
}

function parseDoneInfo(raw: string | null): DoneInfo | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DoneInfo>;
    return typeof value.maskedEmail === "string" && typeof value.at === "string"
      ? { maskedEmail: value.maskedEmail, at: value.at }
      : null;
  } catch {
    return null;
  }
}

function saveDoneInfo(eventId: string, info: DoneInfo) {
  try {
    window.localStorage.setItem(storageKey(eventId), JSON.stringify(info));
  } catch {
    // Sin almacenamiento disponible: el bloque se muestra igual en esta visita.
  }
}

const subscribeToNothing = () => () => {};
const getServerSnapshot = () => null;

const RATE_LIMIT_MESSAGE = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
const NETWORK_ERROR_MESSAGE = "No pudimos conectarnos. Revisa tu internet e inténtalo nuevamente.";

export default function EventRegistrationForm({ eventId }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Estado "ya te inscribiste": en memoria y en localStorage (por evento).
  const [doneInfo, setDoneInfo] = useState<DoneInfo | null>(null);
  const [showForm, setShowForm] = useState(false);
  // Datos de la última solicitud, SOLO en memoria, para "Reenviar correo".
  const [lastInput, setLastInput] = useState<RegisterForEventInput | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const storedRaw = useSyncExternalStore(
    subscribeToNothing,
    () => readDoneSnapshot(eventId),
    getServerSnapshot
  );
  const storedInfo = useMemo(() => parseDoneInfo(storedRaw), [storedRaw]);
  const done = doneInfo ?? storedInfo;

  async function submitRegistration(input: RegisterForEventInput): Promise<RegisterForEventResult> {
    try {
      return await registerForEvent(input);
    } catch {
      return { success: false, error: NETWORK_ERROR_MESSAGE };
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    if (!isValidEmail(normalizedEmail)) {
      setMessageType("error");
      setMessage("Ingresa un correo valido, por ejemplo usuario@gmail.com.");
      return;
    }

    if (phone && normalizedPhone.length !== phone.trim().length) {
      setMessageType("error");
      setMessage("El telefono solo debe contener numeros.");
      return;
    }

    if (normalizedPhone.length !== 10) {
      setMessageType("error");
      setMessage("El teléfono debe tener exactamente 10 dígitos.");
      return;
    }

    if (isClientRateLimited(`event-registration:${eventId}`, 5, 60 * 60 * 1000)) {
      setMessageType("error");
      setMessage(RATE_LIMIT_MESSAGE);
      return;
    }

    const cleanFullName = sanitizeText(fullName, 120);

    if (!cleanFullName) {
      setMessageType("error");
      setMessage("Ingresa tu nombre completo.");
      return;
    }

    // La inscripción y el correo de confirmación se hacen en el servidor.
    const input: RegisterForEventInput = {
      eventId,
      fullName: cleanFullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      marketingConsent,
    };

    setIsSubmitting(true);
    const result = await submitRegistration(input);
    setIsSubmitting(false);

    if (!result.success) {
      setMessageType("error");
      setMessage(result.error);
      return;
    }

    // El servidor responde igual exista o no el correo: la inscripción solo
    // cuenta cuando la persona confirma desde el enlace del correo.
    const info = { maskedEmail: maskEmail(normalizedEmail), at: new Date().toISOString() };
    saveDoneInfo(eventId, info);
    setDoneInfo(info);
    setLastInput(input);
    setShowForm(false);
    setResendMessage("");
    trackEvent("event_registration", { event_id: eventId });
    setFullName("");
    setEmail("");
    setPhone("");
    setMarketingConsent(false);
  }

  async function handleResend() {
    setResendMessage("");

    // Tras recargar la página no se conserva el correo completo (solo el
    // enmascarado), así que se pide escribir los datos otra vez.
    if (!lastInput) {
      setShowForm(true);
      setMessageType("success");
      setMessage("Para reenviar el enlace, escribe de nuevo tus datos y envía el formulario.");
      return;
    }

    if (isClientRateLimited(`event-registration:${eventId}`, 5, 60 * 60 * 1000)) {
      setResendMessage(RATE_LIMIT_MESSAGE);
      return;
    }

    // Usa el reenvío con espera del servidor: misma respuesta uniforme.
    setIsResending(true);
    const result = await submitRegistration(lastInput);
    setIsResending(false);
    setResendMessage(result.success ? result.message : result.error);
  }

  function handleRegisterAnother() {
    setShowForm(true);
    setMessage("");
    setResendMessage("");
  }

  if (done && !showForm) {
    return (
      <div
        role="status"
        className="space-y-4 rounded-2xl border border-green-200 bg-green-50/80 p-5 text-green-900"
      >
        <p className="text-base font-extrabold">
          Ya te inscribiste con {done.maskedEmail}. Revisa tu correo para confirmar.
        </p>
        <p className="text-sm">
          El enlace vence en 48 horas. Si no lo encuentras, revisa la carpeta de spam.
        </p>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>¿No te llegó?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="font-extrabold underline underline-offset-4 disabled:opacity-60"
          >
            {isResending ? "Reenviando..." : "Reenviar correo"}
          </button>
        </div>
        {resendMessage && <p className="text-sm font-semibold">{resendMessage}</p>}

        <button type="button" onClick={handleRegisterAnother} className="btn-secondary">
          Inscribir a otra persona
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Nombre completo"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <FormField
        label="Correo"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        inputMode="email"
      />

      <FormField
        label="Teléfono"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(normalizePhone(e.target.value))}
        inputMode="numeric"
        maxLength={10}
        pattern="[0-9]{10}"
      />

      <label className="flex items-start gap-3 rounded-2xl border border-[#e8e2d6] bg-[#f6f1e8]/60 p-4 text-sm leading-6 text-gray-700">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span>
          Acepto recibir comunicaciones de la IVBCC sobre este evento (opcional). Autorizo el
          tratamiento de mis datos conforme a la Ley 1581 de 2012; puedo darme de baja en
          cualquier momento desde el enlace de cada mensaje.
        </span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full py-4 text-base font-black disabled:opacity-60"
      >
        {isSubmitting ? "Enviando..." : "Inscribirme"}
      </button>

      {message && (
        <p
          role={messageType === "error" ? "alert" : "status"}
          className={`form-note ${
            messageType === "success" ? "border-green-200 bg-green-50/80 text-green-800" : "border-red-200 bg-red-50/80 text-red-800"
          }`}
        >
          {message}
        </p>
      )}

    </form>
  );
}
