import AuthShell from "@/components/ui/AuthShell";
import UpdatePasswordForm from "./UpdatePasswordForm";

export default function ActualizarPasswordPage() {
  return (
    <AuthShell
      eyebrow="Seguridad"
      title="Actualizar contraseña"
      description="Crea una nueva contraseña para continuar con tu cuenta."
      panelTitle="Nuevo acceso"
      panelCopy="Completa el cambio y vuelve a tu ruta de formación con una sesión protegida."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
