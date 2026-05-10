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
    .select("first_name,last_name,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect("/");
  }

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const adminName =
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
    user.email ||
    "Administrador";

  return (
    <AdminShell
      pathname={pathname}
      adminName={adminName}
      adminRole="Administrador"
    >
      {children}
    </AdminShell>
  );
}
