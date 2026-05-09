import Link from "next/link";
import AuthShell from "@/components/ui/AuthShell";
import PublicLoginForm from "./PublicLoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Acceso"
      title="Iniciar sesión"
      description="Accede a tu experiencia de formación, seguimiento y recursos de IVBCC."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-extrabold text-[var(--ivbcc-navy)] transition hover:text-[var(--ivbcc-gold)]">
            Regístrate
          </Link>
        </>
      }
    >
      <PublicLoginForm />
    </AuthShell>
  );
}
