import Link from "next/link";

const mainChurch = {
  name: "Iglesia Valle de Bendición Cruzada Cristiana",
  city: "Valledupar, Cesar",
  address: "Cl. 18 #11 - 114 V/par, Cesar",
  phone: "318 7166545",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Cl.+18+%2311-114+Valledupar+Cesar",
};

const upcomingChurches = [
  {
    name: "Nueva sede IVBCC",
    location: "Colombia",
    address: "",
  },
  {
    name: "Punto de encuentro internacional",
    location: "Próximamente",
    address: "",
  },
  {
    name: "Comunidad en expansión",
    location: "Próximamente",
    address: "",
  },
];

export default function IglesiasPage() {
  return (
    <main className="bg-[#faf8f2] text-gray-900">
      <section className="bg-[var(--ivbcc-navy)] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
            Comunidad IVBCC
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
            Iglesias
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
            Conoce nuestras sedes y puntos de encuentro.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Sede principal
          </p>
          <h2 className="mt-3 text-3xl font-bold text-gray-950">
            Nuestra casa en Valledupar
          </h2>
        </div>

        <article className="rounded-2xl bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-950">{mainChurch.name}</h3>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
                Ciudad
              </p>
              <p className="mt-2 text-base leading-7 text-gray-600">
                {mainChurch.city}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
                Dirección
              </p>
              <p className="mt-2 text-base leading-7 text-gray-600">
                {mainChurch.address}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
                Teléfono
              </p>
              <p className="mt-2 text-base leading-7 text-gray-600">
                {mainChurch.phone}
              </p>
            </div>
          </div>

          <a
            href={mainChurch.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block rounded-lg bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Ver en Google Maps
          </a>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Otras sedes
          </p>
          <h2 className="mt-3 text-3xl font-bold text-gray-950">
            Caminando hacia nuevos puntos de encuentro
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
            Próximamente agregaremos más sedes.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {upcomingChurches.map((church) => (
            <article
              key={church.name}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-bold text-gray-950">{church.name}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {church.location}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {church.address || "Próximamente compartiremos la dirección y horarios."}
              </p>

              {church.address ? (
                <Link
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(church.address)}`}
                  target="_blank"
                  className="mt-4 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
                >
                  Ver en Google Maps
                </Link>
              ) : (
                <p className="mt-4 text-sm font-medium text-gray-400">
                  Información en actualización
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
