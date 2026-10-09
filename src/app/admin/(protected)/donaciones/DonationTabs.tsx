import Link from "next/link";

const tabs = [
  { key: "metodos", href: "/admin/donaciones", label: "Métodos de pago" },
  { key: "registro", href: "/admin/donaciones/registro", label: "Registro de donaciones" },
] as const;

export function DonationTabs({ current }: { current: (typeof tabs)[number]["key"] }) {
  return (
    <nav
      aria-label="Secciones de donaciones"
      className="flex gap-4 border-b border-[var(--ivbcc-line)] text-sm font-extrabold mb-6"
    >
      {tabs.map((tab) => {
        const isActive = current === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`pb-3 border-b-2 transition ${
              isActive
                ? "border-[var(--ivbcc-navy)] text-[var(--ivbcc-navy)]"
                : "border-transparent text-[var(--ivbcc-muted)] hover:text-[var(--ivbcc-ink)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
