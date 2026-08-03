import {
  AdminActionButton,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";

export default function AdminNotFound() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Página no encontrada"
        subtitle="La sección que buscas no existe o cambió de lugar."
        icon="spark"
      />
      <AdminEmptyState
        title="No encontramos esta sección del panel"
        description="Revisa el enlace o vuelve al dashboard para continuar."
        icon="spark"
        action={
          <AdminActionButton href="/admin/dashboard" icon="arrow" tone="gold">
            Volver al dashboard
          </AdminActionButton>
        }
      />
    </AdminPageShell>
  );
}
