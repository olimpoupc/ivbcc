"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AuthFeedback from "@/components/AuthFeedback";
import {
  AdminEmptyState,
  AdminPanelCard,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import { supabase } from "@/lib/supabase";
import { buildSafeStoragePath, validateImageFile } from "@/lib/security";

type DonationMethodType =
  | "nequi"
  | "bancolombia"
  | "daviplata"
  | "davivienda"
  | "breb_key"
  | "paypal"
  | "wompi"
  | "mercadopago"
  | "other";

export type DonationMethodRow = {
  id: string;
  title: string;
  method_type: DonationMethodType;
  description: string | null;
  account_holder: string | null;
  account_number: string | null;
  bank_name: string | null;
  document_number: string | null;
  phone: string | null;
  qr_image_url: string | null;
  payment_url: string | null;
  instructions: string | null;
  order_index: number | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DonationMethodFormState = {
  title: string;
  method_type: DonationMethodType;
  description: string;
  account_holder: string;
  account_number: string;
  bank_name: string;
  document_number: string;
  phone: string;
  qr_image_url: string;
  payment_url: string;
  instructions: string;
  order_index: string;
  is_active: boolean;
};

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
};

const methodTypeOptions: Array<{ value: DonationMethodType; label: string }> = [
  { value: "nequi", label: "Nequi" },
  { value: "bancolombia", label: "Bancolombia" },
  { value: "daviplata", label: "Daviplata" },
  { value: "davivienda", label: "Davivienda" },
  { value: "breb_key", label: "Bre-B / Llave" },
  { value: "paypal", label: "PayPal" },
  { value: "wompi", label: "Wompi" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "other", label: "Otro" },
];

const fixedBankNames: Partial<Record<DonationMethodType, string>> = {
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  daviplata: "Daviplata",
  davivienda: "Davivienda",
};

const brebSuggestedInstructions =
  "Desde tu banco, entra a Bre-B, elige enviar a una llave, ingresa la llave registrada y confirma el aporte.";

const donationMethodSelect =
  "id,title,method_type,description,account_holder,account_number,bank_name,document_number,phone,qr_image_url,payment_url,instructions,order_index,is_active,created_at,updated_at";

const emptyForm: DonationMethodFormState = {
  title: "",
  method_type: "nequi",
  description: "",
  account_holder: "",
  account_number: "",
  bank_name: "Nequi",
  document_number: "",
  phone: "",
  qr_image_url: "",
  payment_url: "",
  instructions: "",
  order_index: "0",
  is_active: true,
};

function getMethodTypeLabel(value: string) {
  return methodTypeOptions.find((option) => option.value === value)?.label || "Otro";
}

function getBankFieldLabel(methodType: DonationMethodType) {
  return methodType === "breb_key" ? "Entidad asociada" : "Banco";
}

function getAccountNumberLabel(methodType: DonationMethodType) {
  if (methodType === "nequi" || methodType === "daviplata") return "Número celular";
  if (methodType === "bancolombia" || methodType === "davivienda") {
    return "Número de cuenta o referencia";
  }
  if (methodType === "breb_key") return "Llave";
  if (
    methodType === "paypal" ||
    methodType === "wompi" ||
    methodType === "mercadopago"
  ) {
    return "URL de pago";
  }

  return "Número de cuenta o referencia";
}

function toFormState(method: DonationMethodRow): DonationMethodFormState {
  return {
    title: method.title || "",
    method_type: method.method_type || "other",
    description: method.description || "",
    account_holder: method.account_holder || "",
    account_number: method.account_number || "",
    bank_name: fixedBankNames[method.method_type] ?? method.bank_name ?? "",
    document_number: method.document_number || "",
    phone: method.phone || "",
    qr_image_url: method.qr_image_url || "",
    payment_url: method.payment_url || "",
    instructions: method.instructions || "",
    order_index: String(method.order_index ?? 0),
    is_active: method.is_active ?? true,
  };
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getStoragePathFromPublicUrl(value?: string | null) {
  if (!value) return null;
  const marker = "/storage/v1/object/public/news-images/";
  const index = value.indexOf(marker);
  return index >= 0 ? value.slice(index + marker.length) : null;
}

function buildQrPath(file: File) {
  return buildSafeStoragePath("donations/qr", file);
}

export default function DonationMethodsPanel({
  initialMethods,
}: {
  initialMethods: DonationMethodRow[];
}) {
  const [methods, setMethods] = useState(initialMethods);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DonationMethodFormState>(emptyForm);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({
    type: "info",
    message: "",
  });
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const qrPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (qrPreviewUrlRef.current) {
        URL.revokeObjectURL(qrPreviewUrlRef.current);
      }
    };
  }, []);

  function updateField<K extends keyof DonationMethodFormState>(
    field: K,
    value: DonationMethodFormState[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateMethodType(methodType: DonationMethodType) {
    setForm((current) => ({
      ...current,
      method_type: methodType,
      bank_name:
        fixedBankNames[methodType] ??
        (current.bank_name === fixedBankNames[current.method_type]
          ? ""
          : current.bank_name),
      instructions:
        methodType === "breb_key" && !current.instructions.trim()
          ? brebSuggestedInstructions
          : current.instructions,
    }));
  }

  const bankFieldLabel = getBankFieldLabel(form.method_type);
  const accountNumberLabel = getAccountNumberLabel(form.method_type);
  const isBankReadonly = Boolean(fixedBankNames[form.method_type]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setQrFile(null);
    setQrPreviewUrl(null);
    if (qrPreviewUrlRef.current) {
      URL.revokeObjectURL(qrPreviewUrlRef.current);
      qrPreviewUrlRef.current = null;
    }
    if (qrInputRef.current) qrInputRef.current.value = "";
  }

  function startEdit(method: DonationMethodRow) {
    setEditingId(method.id);
    setForm(toFormState(method));
    setQrFile(null);
    setQrPreviewUrl(null);
    if (qrInputRef.current) qrInputRef.current.value = "";
    setFeedback({ type: "info", message: "" });
  }

  async function handleQrChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setQrFile(null);
      setQrPreviewUrl(null);
      return;
    }

    const validationError = await validateImageFile(file);
    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      event.target.value = "";
      setQrFile(null);
      setQrPreviewUrl(null);
      return;
    }

    if (qrPreviewUrlRef.current) {
      URL.revokeObjectURL(qrPreviewUrlRef.current);
      qrPreviewUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    qrPreviewUrlRef.current = previewUrl;
    setQrFile(file);
    setQrPreviewUrl(previewUrl);
  }

  async function uploadQrIfNeeded() {
    if (!qrFile) return form.qr_image_url.trim() || null;

    const qrPath = buildQrPath(qrFile);
    const { error: uploadError } = await supabase.storage
      .from("news-images")
      .upload(qrPath, qrFile, {
        contentType: qrFile.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(qrPath);
    return data.publicUrl;
  }

  async function removeQrFromStorage(url?: string | null) {
    const storagePath = getStoragePathFromPublicUrl(url);
    if (!storagePath) return;

    const { error } = await supabase.storage.from("news-images").remove([storagePath]);
    if (error) console.error(error);
  }

  function buildPayload(qrImageUrl: string | null) {
    return {
      title: form.title.trim(),
      method_type: form.method_type,
      description: nullableText(form.description),
      account_holder: nullableText(form.account_holder),
      account_number: nullableText(form.account_number),
      bank_name: nullableText(form.bank_name),
      document_number: nullableText(form.document_number),
      phone: nullableText(form.phone),
      qr_image_url: qrImageUrl,
      payment_url: nullableText(form.payment_url),
      instructions: nullableText(form.instructions),
      order_index: Number.parseInt(form.order_index, 10) || 0,
      is_active: form.is_active,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback({ type: "info", message: "Guardando método..." });

    try {
      const previousMethod = editingId
        ? methods.find((method) => method.id === editingId) || null
        : null;
      const qrImageUrl = await uploadQrIfNeeded();
      const payload = buildPayload(qrImageUrl);

      const query = editingId
        ? supabase
            .from("donation_methods")
            .update(payload)
            .eq("id", editingId)
            .select(donationMethodSelect)
            .maybeSingle()
        : supabase
            .from("donation_methods")
            .insert(payload)
            .select(donationMethodSelect)
            .maybeSingle();

      const { data, error } = await query;

      if (error || !data) {
        throw error || new Error("No se pudo guardar el método.");
      }

      if (qrFile && previousMethod?.qr_image_url) {
        await removeQrFromStorage(previousMethod.qr_image_url);
      }

      setMethods((current) => {
        const next = editingId
          ? current.map((method) => (method.id === editingId ? data : method))
          : [data, ...current];

        return [...next].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        );
      });
      resetForm();
      setFeedback({ type: "success", message: "Método guardado correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos guardar el método.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(method: DonationMethodRow) {
    const { data, error } = await supabase
      .from("donation_methods")
      .update({ is_active: !(method.is_active ?? true) })
      .eq("id", method.id)
      .select(donationMethodSelect)
      .maybeSingle();

    if (error || !data) {
      setFeedback({
        type: "error",
        message: error?.message || "No pudimos cambiar el estado.",
      });
      return;
    }

    setMethods((current) =>
      current.map((item) => (item.id === method.id ? data : item))
    );
    setFeedback({ type: "success", message: "Estado actualizado." });
  }

  async function deleteMethod(method: DonationMethodRow) {
    const confirmed = confirm(`¿Eliminar el método "${method.title}"?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("donation_methods")
      .delete()
      .eq("id", method.id);

    if (error) {
      setFeedback({
        type: "error",
        message: error.message || "No pudimos eliminar el método.",
      });
      return;
    }

    await removeQrFromStorage(method.qr_image_url);
    setMethods((current) => current.filter((item) => item.id !== method.id));
    if (editingId === method.id) resetForm();
    setFeedback({ type: "success", message: "Método eliminado." });
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form
        onSubmit={handleSubmit}
        className="premium-surface space-y-5 rounded-[24px] p-6"
      >
        <div>
          <p className="kicker">
            {editingId ? "Editar método" : "Nuevo método"}
          </p>
          <h2 className="section-title mt-1 text-2xl text-[var(--ivbcc-ink)]">
            Datos de donación
          </h2>
        </div>

        <AuthFeedback type={feedback.type} message={feedback.message} />

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Título" required>
            <input
              required
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Tipo">
            <select
              value={form.method_type}
              onChange={(event) =>
                updateMethodType(event.target.value as DonationMethodType)
              }
              className={inputClassName}
            >
              {methodTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Descripción"
          help="Texto corto que verá el visitante."
        >
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Apoya la obra de IVBCC usando este método de donación."
            rows={3}
            className={textareaClassName}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Titular">
            <input
              value={form.account_holder}
              onChange={(event) => updateField("account_holder", event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field
            label={bankFieldLabel}
            help={
              form.method_type === "breb_key"
                ? "Nombre del banco o entidad donde está registrada la llave."
                : undefined
            }
          >
            <input
              value={form.bank_name}
              onChange={(event) => updateField("bank_name", event.target.value)}
              readOnly={isBankReadonly}
              placeholder={
                form.method_type === "breb_key" ? "Ej. Davivienda" : undefined
              }
              className={`${inputClassName} read-only:bg-[var(--ivbcc-paper)] read-only:text-[var(--ivbcc-muted)]`}
            />
          </Field>
          <Field
            label={accountNumberLabel}
            help={
              form.method_type === "breb_key"
                ? "La llave puede ser celular, documento, correo o código alfanumérico registrado en Bre-B."
                : undefined
            }
          >
            <input
              value={form.account_number}
              onChange={(event) => updateField("account_number", event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Documento">
            <input
              value={form.document_number}
              onChange={(event) => updateField("document_number", event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Teléfono">
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="Orden">
            <input
              type="number"
              value={form.order_index}
              onChange={(event) => updateField("order_index", event.target.value)}
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="URL de pago">
            <input
              type="url"
              value={form.payment_url}
              onChange={(event) => updateField("payment_url", event.target.value)}
              className={inputClassName}
            />
          </Field>
          <Field label="URL de QR">
            <input
              type="url"
              value={form.qr_image_url}
              onChange={(event) => updateField("qr_image_url", event.target.value)}
              className={inputClassName}
            />
          </Field>
        </div>

        <Field label="Subir QR">
          <input
            ref={qrInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleQrChange}
            className="w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ivbcc-navy)] file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white"
          />
          {(qrPreviewUrl || form.qr_image_url) && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-3">
              <Image
                src={qrPreviewUrl || form.qr_image_url}
                alt="QR de donación"
                width={220}
                height={220}
                unoptimized={Boolean(qrPreviewUrl)}
                className="mx-auto aspect-square max-h-56 w-auto object-contain"
              />
            </div>
          )}
        </Field>

        <Field
          label="Instrucciones"
          help="Pasos detallados para hacer la donación."
        >
          <textarea
            value={form.instructions}
            onChange={(event) => updateField("instructions", event.target.value)}
            placeholder={
              form.method_type === "breb_key"
                ? brebSuggestedInstructions
                : "Describe los pasos que debe seguir el visitante para completar su aporte."
            }
            rows={4}
            className={textareaClassName}
          />
        </Field>

        <label className="flex items-center gap-3 rounded-2xl border border-[var(--ivbcc-line)] bg-white/70 px-4 py-3">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField("is_active", event.target.checked)}
          />
          <span className="text-sm font-extrabold text-[var(--ivbcc-ink)]">
            Método activo y visible en la página pública
          </span>
        </label>

        <div className="flex flex-wrap justify-end gap-3">
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-[var(--ivbcc-line)] bg-white px-5 py-2 text-sm font-extrabold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)]"
            >
              Cancelar edición
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[var(--ivbcc-gold)] px-5 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Guardar método"}
          </button>
        </div>
      </form>

      <AdminSection
        title="Métodos configurados"
        subtitle="Se muestran ordenados por el campo order_index."
        icon="donation"
      >
        <AdminPanelCard>

        <div className="space-y-4">
          {methods.map((method) => (
            <div
              key={method.id}
              className="rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold text-[var(--ivbcc-ink)]">
                      {method.title}
                    </h3>
                    <AdminStatusBadge tone="slate">
                      {getMethodTypeLabel(method.method_type)}
                    </AdminStatusBadge>
                    <AdminStatusBadge tone={method.is_active ? "green" : "slate"}>
                      {method.is_active ? "Activo" : "Inactivo"}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ivbcc-muted)]">
                    Orden {method.order_index ?? 0}
                    {method.account_number
                      ? ` · ${getAccountNumberLabel(method.method_type)} ${method.account_number}`
                      : ""}
                  </p>
                  {method.description ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--ivbcc-muted)]">
                      {method.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(method)}
                    className="rounded-full border border-[var(--ivbcc-line)] bg-white px-3 py-2 text-xs font-extrabold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(method)}
                    className="rounded-full border border-[var(--ivbcc-line)] bg-white px-3 py-2 text-xs font-extrabold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)]"
                  >
                    {method.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMethod(method)}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {methods.length === 0 ? (
          <AdminEmptyState
            title="Aún no hay métodos configurados"
            description="Crea el primer método para activar la página pública de donaciones."
            icon="donation"
          />
        ) : null}
        </AdminPanelCard>
      </AdminSection>
    </section>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]";

const textareaClassName =
  "w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]";

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {help ? <span className="mt-2 block text-xs leading-5 text-[var(--ivbcc-muted)]">{help}</span> : null}
    </label>
  );
}
