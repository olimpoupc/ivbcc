import Image from "next/image";

const founders = [
  {
    names: "Blas Antonio Pedrozo Florez y Ligia Molina de Pedrozo",
    initials: "BP",
  },
  {
    names: "Jose Herrera y Rosa Alicia Blanco",
    initials: "JB",
  },
  {
    names: "Julio César López Muñoz e Ivonne Dalila Díaz De Oro",
    initials: "JD",
  },
];

const faithDeclaration = [
  "La plena inspiración por el Espíritu Santo de las Sagradas Escrituras como regla única e infalible de fe y conducta.",
  "El Eterno Dios Padre, Dios Hijo, y Dios Espíritu Santo; Dios en tres Personas.",
  "La plenitud de la Deidad y Realeza de nuestro Señor Jesucristo y su verdadera humanidad impecable.",
  "Que el Señor Jesucristo fue engendrado por el Espíritu Santo, siendo María virgen.",
  "La muerte sustitutiva y expiatoria de nuestro Señor Jesucristo en la Cruz.",
  "Que el Señor Jesucristo resucitó de entre los muertos con un cuerpo glorificado y que volverá en poder y gran gloria.",
  "La salvación por gracia soberana de Dios, alcanzada por medio de la fe en nuestro Señor Jesucristo.",
  "Que solamente hay dos lugares como destino eterno del ser humano: El Cielo para los redimidos por el Señor Jesucristo y el infierno para los que lo rechacen.",
  "Que la regeneración del ser humano es por el Espíritu Santo y la Palabra de Dios.",
  "La unidad espiritual de todos los redimidos por la Sangre del Señor Jesucristo.",
  "La necesidad de mantener conforme al Evangelio, la pureza de la Iglesia en doctrina y conducta.",
];

export default function NosotrosPage() {
  return (
    <main className="bg-[#faf8f2] text-gray-900">
      <section className="bg-[var(--ivbcc-navy)] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
              Iglesia Valle de Bendición Cruzada Cristiana
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              Nosotros
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
              IVBCC es una comunidad cristiana comprometida con el anuncio del
              evangelio, la formación de discípulos y el servicio a la ciudad de
              Valledupar, Colombia y las naciones.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
            <div className="rounded-2xl bg-white p-8 shadow-lg">
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-[#f6f0dc]">
                <Image
                  src="/images/logonegro.png"
                  alt="Logo IVBCC"
                  width={260}
                  height={120}
                  className="h-auto w-[220px] md:w-[260px]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-8 shadow-sm md:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
              Misión
            </p>
            <h2 className="mt-3 text-3xl font-bold text-gray-950">Nuestra misión</h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              Somos una comunidad viva, sin ánimo de lucro, que proclama,
              practica y enseña el evangelio de fe y poder, formando discípulos
              para Nuestro Señor Jesucristo, quien es el único mediador entre
              Dios y los hombres, con el fin de bendecir a Colombia y a las
              naciones.
            </p>
          </article>

          <article className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
              Visión
            </p>
            <h2 className="mt-3 text-3xl font-bold text-gray-950">Nuestra visión</h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              Desarrollar un avivamiento espiritual permanente que genere
              crecimiento integral en las personas para la gloria de Dios.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <article className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Lo que hacemos
          </p>
          <h2 className="mt-3 text-3xl font-bold text-gray-950">
            Una obra guiada por principios y valores
          </h2>
          <p className="mt-4 max-w-5xl text-base leading-7 text-gray-600">
            Somos una entidad sin ánimo de lucro, reconocida por el Estado
            Colombiano, que propende por la difusión del evangelio en Colombia y
            en otros países del mundo. El trabajo realizado desde 1975 ha sido
            guiado por Dios bajo principios y valores que nos han permitido
            desarrollar nuestra labor.
          </p>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Visionarios y fundadores
          </p>
          <h2 className="mt-3 text-3xl font-bold text-gray-950">
            Hombres y mujeres que marcaron el comienzo
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {founders.map((founder) => (
            <article
              key={founder.names}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <div className="flex h-64 items-center justify-center bg-gradient-to-br from-[#f3ecd6] to-[#e7ddbb]">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--ivbcc-navy)] text-3xl font-bold text-white">
                  {founder.initials}
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold leading-snug text-gray-950">
                  {founder.names}
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Referentes del desarrollo histórico y espiritual de la obra de
                  IVBCC.
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <article className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Declaración de fe
          </p>
          <h2 className="mt-3 text-3xl font-bold text-gray-950">
            DECLARACIÓN DE FE
          </h2>
          <p className="mt-4 text-base font-semibold leading-7 text-gray-700">
            LA IGLESIA CRUZADA CRISTIANA, TIENE COMO BASE FUNDAMENTAL LAS
            SAGRADAS ESCRITURAS Y LA SIGUIENTE DECLARACIÓN DE FÉ:
          </p>

          <div className="mt-8 space-y-4">
            {faithDeclaration.map((item, index) => (
              <div
                key={item}
                className="flex gap-4 rounded-xl border border-gray-100 bg-[#fcfbf7] px-5 py-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ivbcc-navy)] text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
