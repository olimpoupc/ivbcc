export const adminInputClass =
  "min-h-12 w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ivbcc-ink)] outline-none transition placeholder:text-[var(--ivbcc-muted)] focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]";

export const adminTextareaClass =
  "w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[var(--ivbcc-ink)] outline-none transition placeholder:text-[var(--ivbcc-muted)] focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]";

export const adminSelectClass =
  "min-h-12 w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm font-extrabold text-[var(--ivbcc-ink)] outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]";

export const adminFileInputClass =
  "w-full rounded-2xl border border-dashed border-[rgba(7,22,45,0.18)] bg-[var(--ivbcc-paper)] px-4 py-4 text-sm font-semibold text-[var(--ivbcc-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ivbcc-navy)] file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white hover:border-[rgba(201,162,74,0.55)]";

export const adminSecondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(7,22,45,0.16)] bg-white/75 px-5 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ivbcc-gold)]";

export const adminPrimaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--ivbcc-gold)] bg-[var(--ivbcc-gold)] px-5 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] shadow-sm transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export function AdminFormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--ivbcc-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AdminRadioCard({
  children,
  checked,
}: {
  children: React.ReactNode;
  checked: boolean;
}) {
  return (
    <span
      className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
        checked
          ? "border-[var(--ivbcc-gold)] bg-[rgba(201,162,74,0.14)] text-[var(--ivbcc-navy)]"
          : "border-[var(--ivbcc-line)] bg-white/75 text-[var(--ivbcc-muted)]"
      }`}
    >
      {children}
    </span>
  );
}

export function AdminToggleCard({
  children,
  checked,
}: {
  children: React.ReactNode;
  checked: boolean;
}) {
  return (
    <span
      className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
        checked
          ? "border-[var(--ivbcc-gold)] bg-[rgba(201,162,74,0.14)] text-[var(--ivbcc-navy)]"
          : "border-[var(--ivbcc-line)] bg-white/75 text-[var(--ivbcc-ink)]"
      }`}
    >
      {children}
    </span>
  );
}
