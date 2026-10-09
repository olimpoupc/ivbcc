import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-current-pathname") || "";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect("/");
  }

  if (profile?.role !== "admin") {
    redirect("/");
  }

  // Insignia del menú: solo cuenta (head: true, sin traer filas) con la sesión
  // del administrador y RLS. Si falla, simplemente no se muestra.
  let pendingDonations = 0;
  try {
    const { count, error } = await supabase
      .from("donations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) {
      console.error("No se pudo contar las donaciones pendientes:", error);
    } else {
      pendingDonations = count || 0;
    }
  } catch (error) {
    console.error("No se pudo contar las donaciones pendientes:", error);
  }

  return (
    <AdminShell
      pathname={pathname}
      adminRole="Administrador"
      badges={{ pendingDonations }}
    >
      {children}
    </AdminShell>
  );
}
