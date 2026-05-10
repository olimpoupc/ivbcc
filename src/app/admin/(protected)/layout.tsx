import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import LogoutButton from "../LogoutButton";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/noticias", label: "Noticias" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/formacion", label: "Formación" },
  { href: "/admin/certificados", label: "Certificados" },
  { href: "/admin/inscripciones", label: "Inscripciones" },
  { href: "/admin/contacto", label: "Contacto" },
  { href: "/admin/publicaciones", label: "Publicaciones" },
  { href: "/admin/en-vivo", label: "En Vivo" },
  { href: "/admin/chatbot", label: "Chatbot" },
  { href: "/admin/configuracion", label: "Configuración" },
];

function isActiveAdminPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
    <section className="min-h-screen bg-gray-100 flex">
      <aside className="w-72 bg-[var(--ivbcc-navy)] text-white p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">IVBCC</h1>
          <p className="text-sm text-white/70">Panel administrativo</p>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          {adminNavItems.map((item) => {
            const isActive = isActiveAdminPath(pathname, item.href);

            return (
              <Link
                key={item.href}
                className={`px-4 py-3 rounded-lg ${
                  isActive
                    ? "bg-white/10 border border-white/20"
                    : "hover:bg-white/10"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold">Panel IVBCC</h2>

          <div className="flex items-center gap-4">
            <p className="text-sm font-medium">Administrador</p>
            <LogoutButton />
          </div>
        </header>

        <div className="p-8">{children}</div>
      </div>
    </section>
  );
}
