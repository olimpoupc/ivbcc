import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import DeleteCourseButton from "./DeleteCourseButton";
import PublishCourseButton from "./PublishCourseButton";

const statusConfig = {
  published: {
    label: "Publicado",
    tone: "green",
  },
  draft: {
    label: "Borrador",
    tone: "amber",
  },
} as const;

const courseSelect = "id,title,slug,description,image_url,status,created_at";

export default async function AdminFormacionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("courses")
    .select(courseSelect)
    .order("created_at", { ascending: false });

  const publishedCount =
    courses?.filter((course) => (course.status || "draft") === "published").length ||
    0;
  const draftCount =
    courses?.filter((course) => (course.status || "draft") === "draft").length || 0;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar cursos"
        subtitle="Gestiona cursos publicados y borradores para el módulo de formación."
        icon="book"
        actions={
          <AdminActionButton href="/admin/formacion/crear" icon="plus" tone="gold">
            Crear curso
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Cursos totales"
          value={courses?.length || 0}
          detail="Programas registrados"
          icon="book"
          tone="slate"
        />
        <AdminMetricCard
          label="Publicados"
          value={publishedCount}
          detail="Disponibles para alumnos"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Borradores"
          value={draftCount}
          detail="En preparación"
          icon="file"
          tone="navy"
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses?.map((course, index) => {
          const status = course.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;

          return (
            <article
              key={course.id}
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="relative h-44 bg-[var(--ivbcc-paper)]">
                {course.image_url ? (
                  <Image
                    src={course.image_url}
                    alt={course.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Formación"
                    subtitle="Vista previa sin portada."
                    className="h-full"
                  />
                )}

                <span className="absolute left-4 top-4">
                  <AdminStatusBadge tone={currentStatus.tone}>
                    {currentStatus.label}
                  </AdminStatusBadge>
                </span>
              </div>

              <div className="flex min-h-64 flex-col p-5">
                <div className="flex-1">
                  <p className="kicker">
                    {course.slug}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {course.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-3 text-sm leading-6">
                    {course.description}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {course.status === "draft" && (
                    <PublishCourseButton id={course.id} />
                  )}

                  <Link
                    href={`/admin/formacion/${course.id}/quizzes`}
                    className="mt-2 rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver quizzes
                  </Link>
                  <Link
                    href={`/admin/formacion/${course.id}/lecciones`}
                    className="mt-2 rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver lecciones
                  </Link>
                  <Link
                    href={`/admin/certificados?course=${course.id}`}
                    className="mt-2 rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver certificados emitidos
                  </Link>
                  <Link
                    href={`/admin/formacion/${course.id}/editar`}
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
                  >
                    Editar
                  </Link>
                  <DeleteCourseButton id={course.id} imageUrl={course.image_url} />
                </div>
              </div>
            </article>
          );
        })}

        {courses?.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title="Aún no hay cursos registrados"
              description="Crea el primer curso para el módulo de formación."
              icon="book"
              action={
                <AdminActionButton href="/admin/formacion/crear" icon="plus" tone="gold">
                  Crear curso
                </AdminActionButton>
              }
            />
          </div>
        )}
      </section>
    </AdminPageShell>
  );
}
