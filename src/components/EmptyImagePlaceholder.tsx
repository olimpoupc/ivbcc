import Image from "next/image";

type Props = {
  label: string;
  subtitle?: string;
  variant?: "card" | "detail";
  className?: string;
};

export default function EmptyImagePlaceholder({
  label,
  subtitle,
  variant = "card",
  className = "",
}: Props) {
  const isDetail = variant === "detail";

  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(135deg,var(--ivbcc-navy)_0%,#12315a_62%,#c9a24a_145%)] text-white ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_34%),linear-gradient(0deg,rgba(0,0,0,0.18),transparent_58%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--ivbcc-gold)]/50" />

      <div
        className={`relative flex h-full flex-col justify-between ${
          isDetail ? "min-h-80 p-8 md:p-10" : "min-h-full p-5"
        }`}
      >
        <div className="w-fit rounded-xl bg-white/95 px-3 py-2 shadow-sm">
          <Image
            src="/images/logonegro.png"
            alt="Logo IVBCC"
            width={isDetail ? 168 : 126}
            height={isDetail ? 64 : 48}
            className="h-auto w-auto"
          />
        </div>

        <div className={isDetail ? "max-w-2xl" : "max-w-xs"}>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--ivbcc-gold-2)]">
            IVBCC
          </p>
          <h3
            className={`font-display mt-3 font-extrabold leading-tight ${
              isDetail ? "text-3xl md:text-4xl" : "text-xl"
            }`}
          >
            {label}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/80">
            {subtitle || "Contenido disponible para nuestra comunidad."}
          </p>
        </div>
      </div>
    </div>
  );
}
