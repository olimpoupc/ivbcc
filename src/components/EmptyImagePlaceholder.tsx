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
      className={`relative overflow-hidden bg-[linear-gradient(135deg,var(--ivbcc-navy)_0%,#173761_58%,#b88d2c_130%)] text-white ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,215,128,0.22),transparent_30%)]" />
      <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[var(--ivbcc-gold)]/20 blur-3xl" />

      <div
        className={`relative flex h-full flex-col justify-between ${
          isDetail ? "min-h-80 p-8 md:p-10" : "min-h-full p-5"
        }`}
      >
        <div className="w-fit rounded-2xl bg-white/95 px-3 py-2 shadow-sm">
          <Image
            src="/images/logonegro.png"
            alt="Logo IVBCC"
            width={isDetail ? 168 : 126}
            height={isDetail ? 64 : 48}
            className="h-auto w-auto"
          />
        </div>

        <div className={isDetail ? "max-w-2xl" : "max-w-xs"}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
            IVBCC
          </p>
          <h3
            className={`mt-3 font-bold leading-tight ${
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
