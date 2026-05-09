import AuthShell from "@/components/ui/AuthShell";
import RecoverPasswordForm from "./RecoverPasswordForm";

export default function RecuperarPasswordPage() {
  return (
    <AuthShell
      eyebrow="Seguridad"
      title="Recuperar contraseña"
      description="Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."
      panelTitle="Cuenta segura"
      panelCopy="Protege tu acceso a formación, certificados y seguimiento personal dentro de la plataforma."
    >
      <RecoverPasswordForm />
    </AuthShell>
  );
}
