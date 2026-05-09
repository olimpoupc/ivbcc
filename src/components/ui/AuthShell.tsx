import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  panelTitle?: string;
  panelCopy?: string;
  maxWidth?: "md" | "lg";
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  panelTitle = "IVBCC Formación",
  panelCopy = "Un espacio seguro para crecer, aprender y caminar con acompañamiento pastoral.",
  maxWidth = "md",
}: AuthShellProps) {
  const cardWidth = maxWidth === "lg" ? "max-w-5xl" : "max-w-4xl";

  return (
    <main className="premium-page px-4 py-10 md:px-6 md:py-14">
      <section
        className={`site-shell grid min-h-[calc(100vh-9rem)] items-center ${cardWidth}`}
      >
        <div className="premium-surface overflow-hidden rounded-[34px] lg:grid lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="dark-panel hidden min-h-[34rem] flex-col justify-between rounded-none border-0 p-8 shadow-none lg:flex">
            <div>
              <p className="kicker">Acceso premium</p>
              <h2 className="section-title mt-5 text-4xl">
                {panelTitle}
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/68">
                {panelCopy}
              </p>
            </div>

            <div className="grid gap-3 text-sm text-white/72">
              <Link href="/formacion" className="transition hover:text-[var(--ivbcc-gold-2)]">
                Formación
              </Link>
              <Link href="/eventos" className="transition hover:text-[var(--ivbcc-gold-2)]">
                Eventos
              </Link>
              <Link href="/" className="transition hover:text-[var(--ivbcc-gold-2)]">
                Volver al inicio
              </Link>
            </div>
          </aside>

          <div className="bg-white/82 p-6 md:p-10">
            <p className="kicker">{eyebrow}</p>
            <h1 className="section-title mt-3 text-4xl text-gray-950 md:text-5xl">
              {title}
            </h1>
            <p className="muted-copy mt-4 text-sm">
              {description}
            </p>

            <div className="mt-8">{children}</div>

            {footer ? (
              <div className="mt-7 border-t border-[#e8e2d6] pt-6 text-center text-sm text-slate-500">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
