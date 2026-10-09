import Link from "next/link";

export function DonationTabs({ current }: { current: "metodos" | "registro" }) {
  return (
    <nav className="flex gap-4 border-b border-[var(--ivbcc-line)] text-sm font-extrabold mb-6">
      <Link
        href="/admin/donaciones"
        className={`pb-3 border-b-2 transition ${
          current === "metodos"
            ? "border-[var(--ivbcc-navy)] text-[var(--ivbcc-navy)]"
            : "border-transparent text-[var(--ivbcc-muted)] hover:text-[var(--ivbcc-ink)]"
        }`}
      >
        Métodos
      </Link>
      <Link
        href="/admin/donaciones/registro"
        className={`pb-3 border-b-2 transition ${
          current === "registro"
            ? "border-[var(--ivbcc-navy)] text-[var(--ivbcc-navy)]"
            : "border-transparent text-[var(--ivbcc-muted)] hover:text-[var(--ivbcc-ink)]"
        }`}
      >
        Registro
      </Link>
    </nav>
  );
}
