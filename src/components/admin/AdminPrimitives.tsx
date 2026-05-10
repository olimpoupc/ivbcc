import Link from "next/link";
import { AdminIcon, type AdminIconName } from "./AdminIcons";

type Tone = "navy" | "gold" | "slate" | "green" | "amber" | "red" | "blue";

const toneClasses: Record<Tone, string> = {
  navy: "border-[rgba(7,22,45,0.1)] bg-[var(--ivbcc-navy)] text-white",
  gold: "border-[rgba(201,162,74,0.3)] bg-[rgba(201,162,74,0.12)] text-[var(--ivbcc-navy)]",
  slate: "border-[var(--ivbcc-line)] bg-white/80 text-[var(--ivbcc-navy)]",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
};

export function AdminPageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <main className={`space-y-8 ${className}`}>{children}</main>;
}

export function AdminPageHeader({
  eyebrow = "Administración",
  title,
  subtitle,
  icon = "dashboard",
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: AdminIconName;
  actions?: React.ReactNode;
}) {
  return (
    <header className="premium-surface rounded-[var(--ivbcc-radius)] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--ivbcc-navy)] text-[var(--ivbcc-gold-2)] shadow-sm">
            <AdminIcon name={icon} />
          </span>
          <div>
            <p className="kicker">
              {eyebrow}
            </p>
            <h1 className="section-title mt-2 text-3xl text-[var(--ivbcc-ink)] md:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="muted-copy mt-2 max-w-3xl text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function AdminSection({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  icon?: AdminIconName;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 ${className}`}>
      {title || subtitle || actions ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-3">
            {icon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--ivbcc-navy)] text-[var(--ivbcc-gold-2)]">
                <AdminIcon name={icon} className="h-4 w-4" />
              </span>
            ) : null}
            <div>
              {eyebrow ? (
                <p className="kicker">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 className="section-title mt-1 text-2xl text-[var(--ivbcc-ink)]">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="muted-copy mt-1 text-sm">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminPanelCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`premium-surface rounded-[24px] p-6 ${className}`}
    >
      {children}
    </article>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
  href,
  icon = "analytics",
  tone = "navy",
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  href?: string;
  icon?: AdminIconName;
  tone?: "navy" | "gold" | "slate";
}) {
  const content = (
    <div
      className={`group rounded-[24px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${
        tone === "gold"
          ? "border-[rgba(201,162,74,0.28)] bg-[rgba(201,162,74,0.12)] text-[var(--ivbcc-navy)]"
          : tone === "slate"
            ? "border-[var(--ivbcc-line)] bg-white/88 text-[var(--ivbcc-ink)]"
            : "dark-panel"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-sm font-bold ${
              tone === "slate" ? "text-[var(--ivbcc-muted)]" : "text-current/70"
            }`}
          >
            {label}
          </p>
          <p className="mt-3 text-4xl font-black tracking-tight">{value}</p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tone === "slate"
              ? "bg-[var(--ivbcc-navy)] text-[var(--ivbcc-gold-2)]"
              : tone === "gold"
                ? "bg-white text-[var(--ivbcc-navy)]"
                : "bg-white/15"
          }`}
        >
          <AdminIcon name={icon} />
        </span>
      </div>
      {detail ? (
        <p
          className={`mt-4 text-sm ${
            tone === "slate" ? "text-[var(--ivbcc-muted)]" : "text-current/70"
          }`}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function AdminActionButton({
  href,
  children,
  icon,
  tone = "navy",
  external,
}: {
  href: string;
  children: React.ReactNode;
  icon?: AdminIconName;
  tone?: "navy" | "gold" | "outline";
  external?: boolean;
}) {
  const className =
    tone === "gold"
      ? "border-[var(--ivbcc-gold)] bg-[var(--ivbcc-gold)] text-[var(--ivbcc-navy)] hover:opacity-90"
      : tone === "outline"
        ? "border-[rgba(7,22,45,0.16)] bg-white/70 text-[var(--ivbcc-navy)] hover:bg-white"
        : "border-[rgba(7,22,45,0.1)] bg-[var(--ivbcc-navy)] text-white hover:bg-[var(--ivbcc-navy-2)]";

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ivbcc-gold)] ${className}`}
    >
      {icon ? <AdminIcon name={icon} className="h-4 w-4" /> : null}
      {children}
    </Link>
  );
}

export function AdminStatusBadge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon = "spark",
  action,
}: {
  title: string;
  description?: string;
  icon?: AdminIconName;
  action?: React.ReactNode;
}) {
  return (
    <div className="premium-surface rounded-[24px] border-dashed px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ivbcc-navy)] text-[var(--ivbcc-gold-2)]">
        <AdminIcon name={icon} />
      </span>
      <h3 className="section-title mt-4 text-lg text-[var(--ivbcc-ink)]">{title}</h3>
      {description ? (
        <p className="muted-copy mx-auto mt-2 max-w-md text-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="premium-surface overflow-hidden rounded-[24px]">
      <div
        className="grid border-b border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]"
        style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}
      >
        {headers.map((header) => (
          <div key={header}>{header}</div>
        ))}
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

export function AdminQuickAction({
  href,
  title,
  description,
  icon = "arrow",
}: {
  href: string;
  title: string;
  description?: string;
  icon?: AdminIconName;
}) {
  return (
    <Link
      href={href}
      className="premium-surface group flex items-center gap-4 rounded-[24px] p-4 transition hover:-translate-y-0.5 hover:border-[rgba(201,162,74,0.5)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ivbcc-navy)] text-[var(--ivbcc-gold-2)]">
        <AdminIcon name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-[var(--ivbcc-ink)]">{title}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-[var(--ivbcc-muted)]">
            {description}
          </span>
        ) : null}
      </span>
      <AdminIcon
        name="chevron"
        className="h-4 w-4 text-[var(--ivbcc-line)] transition group-hover:text-[var(--ivbcc-gold)]"
      />
    </Link>
  );
}
