import Link from "next/link";
import DonationFlow from "./DonationFlow";
import { createSupabasePublicClient } from "@/lib/supabase-server";
import { buildPageMetadata } from "@/lib/seo";
import type { PublicDonationMethod } from "./actions";

export const revalidate = 300;

export const metadata = buildPageMetadata({
  title: "Donaciones",
  description:
    "Apoya la misión de la Iglesia Valle de Bendición Cruzada Cristiana a través del flujo guiado de donaciones oficiales.",
  path: "/donaciones",
});

export default async function DonacionesPage() {
  let activeMethods: PublicDonationMethod[] = [];
  let loadFailed = false;

  try {
    const supabase = createSupabasePublicClient();
    const { data: methods, error } = await supabase
      .from("donation_methods")
      .select(
        "id,title,method_type,description,account_holder,account_number,bank_name,document_number,phone,qr_image_url,payment_url,instructions"
      )
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      loadFailed = true;
    } else {
      activeMethods = (methods || []) as PublicDonationMethod[];
    }
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return (
      <main className="premium-page">
        <section className="site-shell-wide py-16">
          <div className="premium-surface rounded-[30px] p-8 text-sm text-slate-500">
            No pudimos cargar los métodos de donación en este momento. Por favor, intenta más tarde.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
          <div className="hero-inner px-6 py-12 md:px-10 md:py-16">
            <p className="kicker">Donaciones IVBCC</p>
            <h1 className="display-title mt-4 max-w-4xl text-5xl md:text-7xl">
              Apoya esta obra
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 md:text-lg">
              Tu generosidad acompaña la misión de servir, formar y bendecir a
              nuestra comunidad. Usa únicamente los métodos oficiales registrados
              en este flujo guiado.
            </p>
          </div>
        </div>
      </section>

      <section className="site-shell-wide py-12">
        {activeMethods.length > 0 ? (
          <DonationFlow methods={activeMethods} />
        ) : (
          <div className="premium-surface rounded-[30px] px-6 py-16 text-center max-w-2xl mx-auto">
            <h2 className="section-title text-3xl text-gray-950">
              Pronto publicaremos métodos de donación.
            </h2>
            <p className="muted-copy mx-auto mt-3 max-w-xl">
              Si deseas apoyar la obra mientras tanto, comunícate directamente
              con el equipo pastoral y administrativo de IVBCC.
            </p>
            <Link href="/contacto" className="btn-primary mt-6 inline-block">
              Contactar
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
