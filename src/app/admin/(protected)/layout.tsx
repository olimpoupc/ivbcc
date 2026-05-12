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

  return (
    <AdminShell
      pathname={pathname}
      adminRole="Administrador"
    >
      {children}
    </AdminShell>
  );
}
