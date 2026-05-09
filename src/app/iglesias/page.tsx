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
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
        <div className="hero-inner px-6 py-12 md:px-10 md:py-16">
          <p className="kicker">
            Comunidad IVBCC
          </p>
          <h1 className="display-title mt-5 text-5xl md:text-7xl">
            Iglesias
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
            Conoce nuestras sedes y puntos de encuentro.
          </p>
        </div>
        </div>
      </section>

      <section className="site-shell-wide py-14">
        <div className="mb-8">
          <p className="kicker">
            Sede principal
          </p>
          <h2 className="section-title mt-3 text-4xl text-gray-950">
            Nuestra casa en Valledupar
          </h2>
        </div>

        <article className="premium-surface rounded-[30px] p-8">
          <h3 className="section-title text-3xl text-gray-950">{mainChurch.name}</h3>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <p className="kicker">
                Ciudad
              </p>
              <p className="muted-copy mt-2">
                {mainChurch.city}
              </p>
            </div>

            <div>
              <p className="kicker">
                Dirección
              </p>
              <p className="muted-copy mt-2">
                {mainChurch.address}
              </p>
            </div>

            <div>
              <p className="kicker">
                Teléfono
              </p>
              <p className="muted-copy mt-2">
                {mainChurch.phone}
              </p>
            </div>
          </div>

          <a
            href={mainChurch.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary mt-8"
          >
            Ver en Google Maps
          </a>
        </article>
      </section>

      <section className="site-shell-wide pb-16">
        <div className="mb-8">
          <p className="kicker">
            Otras sedes
          </p>
          <h2 className="section-title mt-3 text-4xl text-gray-950">
            Caminando hacia nuevos puntos de encuentro
          </h2>
          <p className="muted-copy mt-4 max-w-3xl">
            Próximamente agregaremos más sedes.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {upcomingChurches.map((church) => (
            <article
              key={church.name}
              className="premium-surface rounded-[24px] p-6"
            >
              <h3 className="section-title text-xl text-gray-950">{church.name}</h3>
              <p className="muted-copy mt-3 text-sm">
                {church.location}
              </p>
              <p className="muted-copy mt-2 text-sm">
                {church.address || "Próximamente compartiremos la dirección y horarios."}
              </p>

              {church.address ? (
                <Link
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(church.address)}`}
                  target="_blank"
                  className="mt-4 inline-block font-extrabold text-[var(--ivbcc-navy)]"
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
