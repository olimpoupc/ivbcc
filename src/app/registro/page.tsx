import Link from "next/link";
import AuthShell from "@/components/ui/AuthShell";
import PublicRegisterForm from "./PublicRegisterForm";

export default function RegistroPage() {
  return (
    <AuthShell
      eyebrow="Registro"
      title="Crear cuenta"
      description="Regístrate para avanzar en tu proceso de formación y guardar tu progreso."
      maxWidth="lg"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-extrabold text-[var(--ivbcc-navy)] transition hover:text-[var(--ivbcc-gold)]">
            Inicia sesión
          </Link>
        </>
      }
    >
      <PublicRegisterForm />
    </AuthShell>
  );
}
