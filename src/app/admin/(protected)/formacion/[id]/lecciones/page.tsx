import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminPagination,
  AdminPanelCard,
} from "@/components/admin/AdminPrimitives";
import {
  buildListHref,
  getPageParam,
  getPageRange,
  type AdminListSearchParams,
} from "@/lib/admin-query";
import DeleteLessonButton from "./DeleteLessonButton";

const PAGE_SIZE = 25;

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function CursoLeccionesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const search = await searchParams;
  const page = getPageParam(search);
  const { from, to } = getPageRange(page, PAGE_SIZE);
  const supabase = await createSupabaseServerClient();

  const [
    { data: course, error: courseError },
    { data: lessons, error: lessonsError },
    { count: totalCount },
  ] = await Promise.all([
    supabase.from("courses").select("id,title").eq("id", id).maybeSingle(),
    supabase
      .from("lessons")
      .select("id,title,order,material_url")
      .eq("course_id", id)
      .order("order", { ascending: true })
      .range(from, to),
    supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("course_id", id),
  ]);

  if (courseError || !course) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Formación"
          title="Curso no encontrado"
          icon="book"
        />
      </AdminPageShell>
    );
  }

  if (lessonsError) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Formación"
          title="Lecciones del curso"
          subtitle="Error cargando lecciones."
          icon="book"
        />
      </AdminPageShell>
    );
  }

  const totalItems = totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const buildHref = (targetPage: number) =>
    buildListHref(`/admin/formacion/${id}/lecciones`, {
      page: targetPage > 1 ? String(targetPage) : undefined,
    });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Formación"
        title="Lecciones del curso"
        subtitle={course.title}
        icon="book"
        actions={
          <>
            <AdminActionButton href={`/admin/formacion/${id}/lecciones/crear`} icon="plus" tone="gold">
              Crear lección
            </AdminActionButton>
            <AdminActionButton href="/admin/formacion" icon="arrow" tone="outline">
              Volver a cursos
            </AdminActionButton>
          </>
        }
      />

      <AdminPanelCard className="overflow-hidden p-0">
        <div className="grid grid-cols-12 border-b border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-muted)]">
          <div className="col-span-2">Orden</div>
          <div className="col-span-7">Título</div>
          <div className="col-span-3 text-right">Acciones</div>
        </div>

        {lessons?.length ? (
          lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="grid grid-cols-12 items-center border-b border-[var(--ivbcc-line)] px-5 py-4 text-sm"
            >
              <div className="col-span-2 font-semibold text-[var(--ivbcc-muted)]">
                {lesson.order}
              </div>
              <div className="col-span-7 font-extrabold text-[var(--ivbcc-ink)]">
                {lesson.title}
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <Link
                  href={`/admin/formacion/${id}/lecciones/${lesson.id}/editar`}
                  className="rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
                >
                  Editar
                </Link>
                <DeleteLessonButton
                  id={lesson.id}
                  courseId={id}
                  materialUrl={lesson.material_url}
                />
              </div>
            </article>
          ))
        ) : (
          <div className="p-6">
            <AdminEmptyState
              title="Este curso aún no tiene lecciones"
              description="Crea la primera lección para estructurar el curso."
              icon="book"
            />
          </div>
        )}

        <div className="px-5 pb-5">
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            buildHref={buildHref}
          />
        </div>
      </AdminPanelCard>
    </AdminPageShell>
  );
}
