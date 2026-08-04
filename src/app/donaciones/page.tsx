import Image from "next/image";
import Link from "next/link";
import DonationMethodActions from "./DonationMethodActions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildPageMetadata({
  title: "Donaciones",
  description:
    "Apoya la misión de la Iglesia Valle de Bendición Cruzada Cristiana a través de los métodos de donación oficiales configurados por IVBCC.",
  path: "/donaciones",
});

type DonationMethod = {
  id: string;
  title: string;
  method_type: string;
  description: string | null;
  account_holder: string | null;
  account_number: string | null;
  bank_name: string | null;
  document_number: string | null;
  phone: string | null;
  qr_image_url: string | null;
  payment_url: string | null;
  instructions: string | null;
  order_index: number | null;
};

const methodLabels: Record<string, string> = {
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  daviplata: "Daviplata",
  davivienda: "Davivienda",
  breb_key: "Bre-B / Llave",
  paypal: "PayPal",
  wompi: "Wompi",
  mercadopago: "Mercado Pago",
  other: "Otro",
};

function isBrebMethod(method: DonationMethod) {
  return method.method_type === "breb_key";
}

function isPaymentLinkMethod(method: DonationMethod) {
  return (
    method.method_type === "paypal" ||
    method.method_type === "wompi" ||
    method.method_type === "mercadopago"
  );
}

function getAccountNumberLabel(methodType: string) {
  if (methodType === "nequi" || methodType === "daviplata") return "Número celular";
  if (methodType === "bancolombia" || methodType === "davivienda") {
    return "Cuenta o referencia";
  }
  if (methodType === "breb_key") return "Llave";
  if (
    methodType === "paypal" ||
    methodType === "wompi" ||
    methodType === "mercadopago"
  ) {
    return "Referencia de pago";
  }

  return "Referencia";
}

// Only the last 4 characters stay visible — the full account_holder ID
// number doesn't need to be public just because some banks ask donors to
// enter it when transferring.
function maskDocumentNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "*".repeat(trimmed.length);
  return `${"*".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

function detailRows(method: DonationMethod) {
  const isBreb = isBrebMethod(method);

  return [
    { label: "Titular", value: method.account_holder },
    {
      label: isBreb ? "Entidad asociada" : "Banco",
      value: method.bank_name,
    },
    {
      label: getAccountNumberLabel(method.method_type),
      value: isBreb ? null : method.account_number,
    },
    {
      label: "Documento",
      value: method.document_number
        ? maskDocumentNumber(method.document_number)
        : null,
    },
    { label: "Teléfono", value: method.phone },
  ].filter((item) => item.value);
}

export default async function DonacionesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: methods, error } = await supabase
    .from("donation_methods")
    .select(
      "id,title,method_type,description,account_holder,account_number,bank_name,document_number,phone,qr_image_url,payment_url,instructions,order_index"
    )
    .eq("is_active", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="premium-page">
        <section className="site-shell-wide py-16">
          <div className="premium-surface rounded-[30px] p-8 text-sm text-slate-500">
            No pudimos cargar los métodos de donación en este momento.
          </div>
        </section>
      </main>
    );
  }

  const activeMethods = (methods || []) as DonationMethod[];

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
              nuestra comunidad. Usa únicamente los métodos oficiales publicados
              aquí.
            </p>
          </div>
        </div>
      </section>

      <section className="site-shell-wide py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker">Métodos disponibles</p>
            <h2 className="section-title mt-2 text-4xl text-gray-950">
              Elige cómo donar
            </h2>
          </div>
          <Link href="/contacto" className="btn-ghost w-fit">
            ¿Necesitas ayuda?
          </Link>
        </div>

        {activeMethods.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {activeMethods.map((method) => (
              <article
                key={method.id}
                className="premium-surface overflow-hidden rounded-[30px]"
              >
                <div className="grid gap-0 md:grid-cols-[0.72fr_1fr]">
                  <div className="flex min-h-full items-center justify-center bg-slate-950 p-6">
                    {method.qr_image_url ? (
                      <div className="rounded-[24px] bg-white p-4 shadow-2xl">
                        <Image
                          src={method.qr_image_url}
                          alt={`QR ${method.title}`}
                          width={320}
                          height={320}
                          className="aspect-square w-full max-w-[280px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-white/10 bg-white/8 px-6 py-12 text-center text-sm font-semibold text-white/70">
                        Método sin QR
                      </div>
                    )}
                  </div>

                  <div className="p-6 md:p-7">
                    <span className="badge">
                      {methodLabels[method.method_type] || "Donación"}
                    </span>
                    <h3 className="section-title mt-4 text-3xl text-gray-950">
                      {method.title}
                    </h3>
                    {method.description ? (
                      <p className="muted-copy mt-3 text-sm">
                        {method.description}
                      </p>
                    ) : null}

                    {isBrebMethod(method) && method.account_number ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                          Llave Bre-B
                        </p>
                        <p className="mt-2 break-words text-xl font-black text-slate-950">
                          {method.account_number}
                        </p>
                      </div>
                    ) : null}

                    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                      {detailRows(method).map((row) => (
                        <div
                          key={row.label}
                          className="rounded-2xl border border-slate-100 bg-white/70 p-4"
                        >
                          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            {row.label}
                          </dt>
                          <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {method.instructions ? (
                      <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-slate-700">
                        <p className="font-bold text-slate-950">
                          Instrucciones
                        </p>
                        <p className="mt-2 whitespace-pre-line">
                          {method.instructions}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-6">
                      <DonationMethodActions
                        title={method.title}
                        accountNumber={method.account_number}
                        accountCopyButtonText={
                          isBrebMethod(method)
                            ? "Copiar llave"
                            : isPaymentLinkMethod(method)
                              ? "Copiar referencia"
                              : undefined
                        }
                        accountCopyLabel={
                          isBrebMethod(method)
                            ? "Llave"
                            : isPaymentLinkMethod(method)
                              ? "Referencia"
                              : undefined
                        }
                        phone={method.phone}
                        paymentUrl={method.payment_url}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="premium-surface rounded-[30px] px-6 py-16 text-center">
            <h2 className="section-title text-3xl text-gray-950">
              Pronto publicaremos métodos de donación.
            </h2>
            <p className="muted-copy mx-auto mt-3 max-w-xl">
              Si deseas apoyar la obra mientras tanto, comunícate directamente
              con el equipo de IVBCC.
            </p>
            <Link href="/contacto" className="btn-primary mt-6">
              Contactar
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
