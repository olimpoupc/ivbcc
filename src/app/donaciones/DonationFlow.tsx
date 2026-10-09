"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatColombianPesos } from "@/lib/donations";
import {
  createDonation,
  uploadDonationReceipt,
  type PublicDonationMethod,
  type CreateDonationResult,
} from "./actions";

type Props = {
  methods: PublicDonationMethod[];
};

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000];

export default function DonationFlow({ methods }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  // Paso 1: Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState(
    methods[0]?.id || ""
  );
  const [amount, setAmount] = useState<number>(50000);
  const [customAmountText, setCustomAmountText] = useState("");
  const [dataConsent, setDataConsent] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Paso 2: Donación creada
  const [createdDonation, setCreatedDonation] = useState<{
    id: string;
    reference_code: string;
    amount: number;
    method_title: string;
    upload_token: string;
  } | null>(null);
  const [currentMethod, setCurrentMethod] = useState<PublicDonationMethod | null>(
    null
  );

  // Paso 2: Subida de comprobante
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedReceiptPath, setUploadedReceiptPath] = useState<string | null>(
    null
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleAmountQuickSelect = (val: number) => {
    setAmount(val);
    setCustomAmountText("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setCustomAmountText(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setAmount(parsed);
    } else {
      setAmount(0);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    if (!firstName.trim() || !lastName.trim()) {
      setStep1Error("Por favor ingresa tu nombre y apellido completos.");
      return;
    }

    if (!selectedMethodId) {
      setStep1Error("Por favor selecciona un método de donación.");
      return;
    }

    if (!amount || amount < 1000 || amount > 20000000) {
      setStep1Error(
        "El monto debe estar entre $ 1.000 y $ 20.000.000 de pesos colombianos."
      );
      return;
    }

    if (!dataConsent) {
      setStep1Error(
        "Debes aceptar la autorización de tratamiento de datos personales para continuar."
      );
      return;
    }

    startTransition(async () => {
      const res: CreateDonationResult = await createDonation({
        firstName,
        lastName,
        email: email.trim() ? email : undefined,
        phone: phone.trim() ? phone : undefined,
        donationMethodId: selectedMethodId,
        amount,
        dataConsent,
      });

      if (!res.success) {
        setStep1Error(res.error);
        return;
      }

      setCreatedDonation(res.donation);
      setCurrentMethod(res.method);
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleReceiptUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!receiptFile) {
      setUploadError("Por favor selecciona un archivo con tu comprobante.");
      return;
    }

    if (!createdDonation) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("referenceCode", createdDonation.reference_code);
      formData.set("uploadToken", createdDonation.upload_token);
      formData.set("receiptFile", receiptFile);

      const res = await uploadDonationReceipt(formData);
      if (!res.success) {
        setUploadError(res.error);
        return;
      }

      setUploadedReceiptPath(res.receiptPath);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleFinishWithoutReceipt = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetFlow = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAmount(50000);
    setCustomAmountText("");
    setDataConsent(false);
    setStep1Error(null);
    setCreatedDonation(null);
    setCurrentMethod(null);
    setReceiptFile(null);
    setUploadError(null);
    setUploadedReceiptPath(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Indicador de pasos */}
      <nav aria-label="Progreso de donación" className="premium-surface rounded-2xl p-4">
        <ol className="flex items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm font-bold">
          <li
            className={`flex items-center gap-2 ${
              step >= 1 ? "text-[var(--ivbcc-navy)] font-black" : "text-slate-400"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
                step > 1
                  ? "bg-emerald-600 text-white"
                  : step === 1
                    ? "bg-[var(--ivbcc-navy)] text-white shadow"
                    : "bg-slate-200 text-slate-600"
              }`}
            >
              {step > 1 ? "✓" : "1"}
            </span>
            <span>Tus datos</span>
          </li>
          <div className="h-0.5 flex-1 bg-slate-200" />
          <li
            className={`flex items-center gap-2 ${
              step >= 2 ? "text-[var(--ivbcc-navy)] font-black" : "text-slate-400"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
                step > 2
                  ? "bg-emerald-600 text-white"
                  : step === 2
                    ? "bg-[var(--ivbcc-navy)] text-white shadow"
                    : "bg-slate-200 text-slate-600"
              }`}
            >
              {step > 2 ? "✓" : "2"}
            </span>
            <span>Transferencia</span>
          </li>
          <div className="h-0.5 flex-1 bg-slate-200" />
          <li
            className={`flex items-center gap-2 ${
              step === 3 ? "text-[var(--ivbcc-navy)] font-black" : "text-slate-400"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
                step === 3
                  ? "bg-[var(--ivbcc-navy)] text-white shadow"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              3
            </span>
            <span>Confirmación</span>
          </li>
        </ol>
      </nav>

      {/* PASO 1: Formulario inicial */}
      {step === 1 && (
        <section className="premium-surface rounded-[30px] p-6 sm:p-10 shadow-xl border border-slate-100">
          <div className="mb-8">
            <span className="badge">Paso 1 de 3</span>
            <h2 className="section-title mt-2 text-3xl sm:text-4xl text-gray-950">
              Registra tu aporte
            </h2>
            <p className="muted-copy mt-2 text-sm sm:text-base">
              Completa tus datos para asociar tu ofrenda y guiarte en el proceso de pago.
            </p>
          </div>

          <form onSubmit={handleStep1Submit} className="space-y-6">
            {step1Error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold"
              >
                {step1Error}
              </div>
            )}

            {/* Datos personales */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="donor-first-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="donor-first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. Juan"
                  maxLength={80}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[var(--ivbcc-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]/20"
                />
              </div>

              <div>
                <label htmlFor="donor-last-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  id="donor-last-name"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Pérez"
                  maxLength={80}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[var(--ivbcc-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]/20"
                />
              </div>

              <div>
                <label htmlFor="donor-email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Correo electrónico <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  id="donor-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@ejemplo.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[var(--ivbcc-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]/20"
                />
              </div>

              <div>
                <label htmlFor="donor-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Teléfono o Celular <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  id="donor-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 300 123 4567"
                  maxLength={20}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[var(--ivbcc-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]/20"
                />
              </div>
            </div>

            {/* Método de Donación */}
            <div>
              <label htmlFor="donor-method-select" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Método de donación <span className="text-red-500">*</span>
              </label>
              {methods.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay métodos de donación disponibles en este momento.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {methods.map((m) => {
                    const isSelected = selectedMethodId === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setSelectedMethodId(m.id)}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? "border-[var(--ivbcc-navy)] bg-[var(--ivbcc-navy)] text-white shadow-md ring-2 ring-[var(--ivbcc-gold)]"
                            : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <p className={`font-bold text-sm ${isSelected ? "text-white" : "text-slate-900"}`}>
                          {m.title}
                        </p>
                        {m.account_holder && (
                          <p className={`text-xs mt-1 truncate ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                            {m.account_holder}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Monto */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Monto a donar (COP) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {QUICK_AMOUNTS.map((amt) => {
                  const isSelected = amount === amt && !customAmountText;
                  return (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => handleAmountQuickSelect(amt)}
                      className={`py-3 px-2 rounded-2xl font-black text-sm border transition ${
                        isSelected
                          ? "border-[var(--ivbcc-gold)] bg-[rgba(201,162,74,0.15)] text-[var(--ivbcc-navy)] shadow-sm ring-1 ring-[var(--ivbcc-gold)]"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {formatColombianPesos(amt)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2">
                <label htmlFor="custom-amount-input" className="block text-xs font-medium text-slate-500 mb-1">
                  O escribe un monto libre:
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    id="custom-amount-input"
                    type="text"
                    inputMode="numeric"
                    value={customAmountText}
                    onChange={handleCustomAmountChange}
                    placeholder="Otro valor (ej. 75000)"
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-8 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[var(--ivbcc-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]/20"
                  />
                </div>
              </div>

              {amount > 0 && (
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Total seleccionado:{" "}
                  <span className="font-extrabold text-[var(--ivbcc-navy)] text-base">
                    {formatColombianPesos(amount)}
                  </span>
                </p>
              )}
            </div>

            {/* Tratamiento de datos Ley 1581 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="data-consent-checkbox"
                  type="checkbox"
                  checked={dataConsent}
                  onChange={(e) => setDataConsent(e.target.checked)}
                  required
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-[var(--ivbcc-navy)] focus:ring-[var(--ivbcc-gold)]"
                />
                <span className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Autorizo de manera libre y voluntaria el tratamiento de mis datos personales
                  a la Iglesia Valle de Bendición Cruzada Cristiana conforme a la Ley 1581 de 2012
                  y su política de privacidad, con el fin exclusivo del registro y verificación de donaciones.
                </span>
              </label>
            </div>

            <button
              id="submit-donation-step-1"
              type="submit"
              disabled={isPending || methods.length === 0}
              className="btn-primary w-full py-4 text-base font-black shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
            >
              {isPending ? "Generando tu registro..." : "Continuar con el pago"}
            </button>
          </form>
        </section>
      )}

      {/* PASO 2: Instrucciones y subida de comprobante */}
      {step === 2 && createdDonation && currentMethod && (
        <section className="space-y-6">
          {/* Tarjeta de instrucciones y código de referencia */}
          <div className="premium-surface rounded-[30px] p-6 sm:p-10 shadow-xl border border-slate-100">
            <span className="badge">Paso 2 de 3</span>
            <h2 className="section-title mt-2 text-3xl sm:text-4xl text-gray-950">
              Dona {formatColombianPesos(createdDonation.amount)} a {currentMethod.title}
            </h2>
            <p className="muted-copy mt-2 text-sm sm:text-base">
              Realiza la transferencia desde la aplicación de tu entidad financiera siguiendo los datos indicados a continuación.
            </p>

            {/* Código de referencia destacado */}
            <div className="mt-6 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-5 sm:p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Código de referencia para tu transferencia
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-950 tracking-wider mt-1">
                  {createdDonation.reference_code}
                </p>
                <p className="text-xs text-amber-900 font-medium mt-1">
                  ⚠️ Importante: Usa este código como descripción o concepto de tu transferencia para identificar tu donación.
                </p>
              </div>
              <button
                type="button"
                id="copy-reference-code-btn"
                onClick={() =>
                  copyToClipboard(
                    createdDonation.reference_code,
                    "refCode"
                  )
                }
                className="btn-ghost shrink-0 bg-white border border-amber-300 px-4 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-amber-100"
              >
                {copiedKey === "refCode" ? "¡Copiado! ✓" : "Copiar referencia"}
              </button>
            </div>

            {/* Datos bancarios del método */}
            <div className="mt-8 grid gap-6 md:grid-cols-[1fr_0.8fr]">
              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 border-b pb-2">
                  Datos de la cuenta
                </h3>

                <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                  {currentMethod.account_holder && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Titular
                      </dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">
                        {currentMethod.account_holder}
                      </dd>
                    </div>
                  )}

                  {currentMethod.bank_name && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Banco / Entidad
                      </dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">
                        {currentMethod.bank_name}
                      </dd>
                    </div>
                  )}

                  {currentMethod.account_number && (
                    <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2 flex items-center justify-between gap-2">
                      <div>
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Número de cuenta / Llave
                        </dt>
                        <dd className="font-mono text-base font-bold text-slate-900 mt-0.5">
                          {currentMethod.account_number}
                        </dd>
                      </div>
                      <button
                        type="button"
                        id="copy-account-number-btn"
                        onClick={() =>
                          copyToClipboard(
                            currentMethod.account_number!,
                            "accNum"
                          )
                        }
                        className="btn-ghost text-xs bg-white border px-3 py-1 font-bold"
                      >
                        {copiedKey === "accNum" ? "¡Copiado! ✓" : "Copiar"}
                      </button>
                    </div>
                  )}

                  {currentMethod.phone && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Teléfono
                      </dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">
                        {currentMethod.phone}
                      </dd>
                    </div>
                  )}
                </dl>

                {currentMethod.instructions && (
                  <div className="rounded-xl bg-amber-50/60 border border-amber-200/60 p-4 text-xs sm:text-sm text-slate-700">
                    <p className="font-bold text-slate-900 mb-1">Instrucciones adicionales:</p>
                    <p className="whitespace-pre-line">{currentMethod.instructions}</p>
                  </div>
                )}

                {currentMethod.payment_url && (
                  <div className="pt-2">
                    <a
                      href={currentMethod.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center gap-2 py-3 px-5 text-sm font-bold"
                    >
                      Abrir enlace de pago oficial ↗
                    </a>
                  </div>
                )}
              </div>

              {/* QR del método si existe */}
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900 p-6 text-center text-white">
                {currentMethod.qr_image_url ? (
                  <div className="rounded-xl bg-white p-3 shadow-lg max-w-[220px]">
                    <Image
                      src={currentMethod.qr_image_url}
                      alt={`QR ${currentMethod.title}`}
                      width={220}
                      height={220}
                      className="aspect-square w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="py-8 text-slate-400 text-sm">
                    Método sin código QR de apoyo. Usa los datos bancarios.
                  </div>
                )}
                <p className="text-xs text-white/70 mt-3">
                  Escanea desde tu app bancaria
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de comprobante */}
          <div className="premium-surface rounded-[30px] p-6 sm:p-10 shadow-xl border border-slate-100">
            <h3 className="section-title text-2xl text-gray-950">
              Adjuntar comprobante de pago
            </h3>
            <p className="muted-copy mt-1 text-sm">
              Sube una captura de pantalla, imagen (JPG, PNG, WebP) o PDF de la transferencia realizada (máx. 5 MB).
            </p>

            <form onSubmit={handleReceiptUpload} className="mt-6 space-y-4">
              {uploadError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold"
                >
                  {uploadError}
                </div>
              )}

              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-slate-300 transition">
                <input
                  id="receipt-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files[0]) {
                      setReceiptFile(files[0]);
                    }
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[var(--ivbcc-navy)] file:text-white hover:file:opacity-90 cursor-pointer"
                />
                {receiptFile && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Archivo seleccionado: {receiptFile.name} ({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleFinishWithoutReceipt}
                  className="btn-ghost w-full sm:w-auto text-sm text-slate-600 hover:text-slate-900"
                >
                  Finalizar sin comprobante
                </button>
                <button
                  id="upload-receipt-btn"
                  type="submit"
                  disabled={isPending || !receiptFile}
                  className="btn-primary w-full sm:w-auto px-6 py-3 text-sm font-bold shadow disabled:opacity-50"
                >
                  {isPending ? "Subiendo archivo..." : "Subir comprobante y finalizar"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* PASO 3: Agradecimiento y confirmación */}
      {step === 3 && createdDonation && (
        <section className="premium-surface rounded-[30px] p-8 sm:p-14 text-center shadow-xl border border-slate-100 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl font-black shadow-inner">
            ✓
          </div>

          <div>
            <span className="badge">¡Donación registrada!</span>
            <h2 className="section-title mt-3 text-3xl sm:text-5xl text-gray-950">
              Muchas gracias por tu generosidad
            </h2>
            <p className="muted-copy mx-auto mt-4 max-w-xl text-base sm:text-lg">
              Tu aporte de{" "}
              <strong className="text-slate-900 font-black">
                {formatColombianPesos(createdDonation.amount)}
              </strong>{" "}
              acompaña la labor del ministerio y el servicio a nuestra comunidad.
            </p>
          </div>

          <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left text-sm text-amber-950 space-y-2">
            <p className="font-bold flex items-center justify-between">
              <span>Código de referencia:</span>
              <span className="font-mono text-base font-black text-slate-900">
                {createdDonation.reference_code}
              </span>
            </p>
            <p className="text-xs text-amber-900 leading-relaxed">
              El estado actual de tu aporte es <strong className="font-bold">Pendiente</strong>.
              Nuestro equipo administrativo conciliará la transferencia y confirmará la donación.
            </p>
            {uploadedReceiptPath ? (
              <p className="text-xs text-emerald-800 font-semibold pt-1">
                ✓ Comprobante recibido y guardado satisfactoriamente.
              </p>
            ) : (
              <p className="text-xs text-slate-600 pt-1">
                Si requieres soporte futuro o constancia, conserva tu código de referencia.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={resetFlow}
              className="btn-primary w-full sm:w-auto px-6 py-3 font-bold"
            >
              Hacer otra donación
            </button>
            <Link
              href="/"
              className="btn-ghost w-full sm:w-auto px-6 py-3 font-bold border border-slate-200 bg-white"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
