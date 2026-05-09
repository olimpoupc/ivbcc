import AuthShell from "@/components/ui/AuthShell";
import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <AuthShell
      eyebrow="Administración"
      title="Panel administrativo"
      description="Acceso privado para gestionar contenido, comunidad y configuración de IVBCC."
      panelTitle="Gestión IVBCC"
      panelCopy="Un entorno privado para mantener noticias, eventos, formación, transmisiones y mensajes al día."
    >
      <AdminLoginForm />
    </AuthShell>
  );
}
