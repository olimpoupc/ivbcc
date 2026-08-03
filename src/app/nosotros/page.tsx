import Image from "next/image";
import blasLigiaPhoto from "./blas-ligia.png";
import joseRosaPhoto from "./jose-rosa.png";
import julioIvonnePhoto from "./julio-ivonne.png";

const founders = [
  {
    names: "Blas Antonio Pedrozo Florez y Ligia Molina de Pedrozo",
    photo: blasLigiaPhoto,
    bio: "Como visionarios y fundadores de la iglesia, los Pastores Blas y Ligia Pedrozo sembraron la semilla de lo que hoy es una vibrante comunidad de fe. Su pasión por el evangelio y su dedicación al servicio a Dios y a los demás guiaron cada paso, marcando el camino hacia el crecimiento espiritual y el bienestar de la comunidad. Son los pilares sobre los que se construyó esta iglesia, dejando un legado perdurable de fe, amor y compromiso con el Reino de Dios.",
  },
  {
    names: "Jose Herrera y Rosa Alicia Blanco",
    photo: joseRosaPhoto,
    bio: "Los Pastores José y Rosa Blanco asumieron la batuta del ministerio con una unción fresca y renovada, continuando el trabajo iniciado por los fundadores. Con visión para el futuro y un profundo amor por la congregación, han fortalecido las bases de la iglesia, guiando a los fieles hacia una vida de crecimiento espiritual y unidad, siempre enfocándose en el discipulado, el amor fraternal y el servicio en el nombre de Cristo.",
  },
  {
    names: "Julio César López Muñoz e Ivonne Dalila Díaz De Oro",
    photo: julioIvonnePhoto,
    bio: "Con una visión hacia el futuro, los Pastores Julio e Ivonne representan la próxima generación de liderazgo en la iglesia. Jóvenes y llenos de fervor por la obra de Dios, están llamados a continuar la misión de sus predecesores y llevar la iglesia a nuevas alturas, con un corazón lleno de pasión por los jóvenes y las nuevas generaciones, avanzando con la fe puesta en un futuro lleno de esperanza y transformación para la comunidad.",
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
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
        <div className="hero-inner grid gap-10 px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="kicker">
              Iglesia Valle de Bendición Cruzada Cristiana
            </p>
            <h1 className="display-title mt-5 text-5xl md:text-7xl">
              Nosotros
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
              IVBCC es una comunidad cristiana comprometida con el anuncio del
              evangelio, la formación de discípulos y el servicio a la ciudad de
              Valledupar, Colombia y las naciones.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="rounded-[24px] bg-white p-8 shadow-lg">
              <div className="flex min-h-[280px] items-center justify-center rounded-[20px] bg-[#f6f0dc]">
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
        </div>
      </section>

      <section className="site-shell-wide py-14">
        <div className="grid gap-6 md:grid-cols-3">
          <article className="premium-surface rounded-[30px] p-8 md:col-span-2">
            <p className="kicker">
              Misión
            </p>
            <h2 className="section-title mt-3 text-4xl text-gray-950">Nuestra misión</h2>
            <p className="muted-copy mt-4">
              Somos una comunidad viva, sin ánimo de lucro, que proclama,
              practica y enseña el evangelio de fe y poder, formando discípulos
              para Nuestro Señor Jesucristo, quien es el único mediador entre
              Dios y los hombres, con el fin de bendecir a Colombia y a las
              naciones.
            </p>
          </article>

          <article className="premium-surface rounded-[30px] p-8">
            <p className="kicker">
              Visión
            </p>
            <h2 className="section-title mt-3 text-4xl text-gray-950">Nuestra visión</h2>
            <p className="muted-copy mt-4">
              Desarrollar un avivamiento espiritual permanente que genere
              crecimiento integral en las personas para la gloria de Dios.
            </p>
          </article>
        </div>
      </section>

      <section className="site-shell-wide pb-14">
        <article className="premium-surface rounded-[30px] p-8">
          <p className="kicker">
            Lo que hacemos
          </p>
          <h2 className="section-title mt-3 text-4xl text-gray-950">
            Una obra guiada por principios y valores
          </h2>
          <p className="muted-copy mt-4 max-w-5xl">
            Somos una entidad sin ánimo de lucro, reconocida por el Estado
            Colombiano, que propende por la difusión del evangelio en Colombia y
            en otros países del mundo. El trabajo realizado desde 1975 ha sido
            guiado por Dios bajo principios y valores que nos han permitido
            desarrollar nuestra labor.
          </p>
        </article>
      </section>

      <section className="site-shell-wide pb-14">
        <div className="mb-8">
          <p className="kicker">
            Visionarios y fundadores
          </p>
          <h2 className="section-title mt-3 text-4xl text-gray-950">
            Hombres y mujeres que marcaron el comienzo
          </h2>
        </div>

        <div className="flex flex-col gap-8">
          {founders.map((founder) => (
            <article
              key={founder.names}
              className="editorial-card flex flex-col overflow-hidden md:flex-row"
            >
              <div className="flex shrink-0 items-center justify-center bg-[linear-gradient(135deg,#f3ecd6,#e7ddbb)] p-6 md:w-64">
                <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl">
                  <Image
                    src={founder.photo}
                    alt={founder.names}
                    fill
                    sizes="(min-width: 768px) 256px, 80vw"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center p-6 md:p-8">
                <h3 className="text-xl font-bold leading-snug text-gray-950">
                  {founder.names}
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {founder.bio}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="site-shell-wide pb-16">
        <article className="premium-surface rounded-[30px] p-8">
          <p className="kicker">
            Declaración de fe
          </p>
          <h2 className="section-title mt-3 text-4xl text-gray-950">
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
                className="flex gap-4 rounded-[20px] border border-[#e8e2d6] bg-[#fcfbf7] px-5 py-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ivbcc-navy)] text-sm font-bold text-white">
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
