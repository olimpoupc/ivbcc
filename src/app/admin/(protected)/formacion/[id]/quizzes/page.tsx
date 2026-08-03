import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import DeleteQuizButton from "./DeleteQuizButton";
import PublishQuizButton from "./PublishQuizButton";

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

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CursoQuizzesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: course, error: courseError }, { data: lessons }, { data: quizzes, error: quizzesError }] =
    await Promise.all([
      supabase.from("courses").select("id,title").eq("id", id).maybeSingle(),
      supabase.from("lessons").select("id,title").eq("course_id", id),
      supabase
        .from("quizzes")
        .select("id,title,status,lesson_id,created_at")
        .eq("course_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (courseError || !course) {
    return (
      <AdminPageShell>
        <AdminPageHeader eyebrow="Formación" title="Curso no encontrado" icon="book" />
      </AdminPageShell>
    );
  }

  if (quizzesError) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Formación"
          title="Quizzes del curso"
          subtitle="Error cargando quizzes."
          icon="book"
        />
      </AdminPageShell>
    );
  }

  const lessonsMap = new Map((lessons || []).map((lesson) => [lesson.id, lesson.title]));

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Formación"
        title="Quizzes del curso"
        subtitle={course.title}
        icon="book"
        actions={
          <>
            <AdminActionButton href={`/admin/formacion/${id}/quizzes/crear`} icon="plus" tone="gold">
              Crear quiz
            </AdminActionButton>
            <AdminActionButton href="/admin/formacion" icon="arrow" tone="outline">
              Volver a cursos
            </AdminActionButton>
          </>
        }
      />

      <AdminPanelCard className="overflow-hidden p-0">
        <div className="hidden grid-cols-12 border-b border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-muted)] lg:grid">
          <div className="col-span-4">Título</div>
          <div className="col-span-3">Estado</div>
          <div className="col-span-3">Lección</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {quizzes?.length ? (
          quizzes.map((quiz) => {
            const status = quiz.status || "draft";
            const currentStatus =
              statusConfig[status as keyof typeof statusConfig] ||
              statusConfig.draft;

            return (
              <article
                key={quiz.id}
                className="grid gap-3 border-b border-[var(--ivbcc-line)] px-5 py-4 text-sm lg:grid-cols-12 lg:items-center"
              >
                <div className="font-extrabold text-[var(--ivbcc-ink)] lg:col-span-4">
                  {quiz.title}
                </div>
                <div className="lg:col-span-3">
                  <AdminStatusBadge tone={currentStatus.tone}>
                    {currentStatus.label}
                  </AdminStatusBadge>
                </div>
                <div className="text-[var(--ivbcc-muted)] lg:col-span-3">
                  {quiz.lesson_id ? lessonsMap.get(quiz.lesson_id) || "Lección no encontrada" : "Quiz general"}
                </div>
                <div className="flex flex-wrap gap-2 lg:col-span-2 lg:justify-end">
                  {quiz.status === "draft" && (
                    <PublishQuizButton id={quiz.id} courseId={id} />
                  )}
                  <Link
                    href={`/admin/formacion/${id}/quizzes/${quiz.id}/editar`}
                    className="rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
                  >
                    Editar
                  </Link>
                  <DeleteQuizButton id={quiz.id} courseId={id} />
                </div>
              </article>
            );
          })
        ) : (
          <div className="p-6">
            <AdminEmptyState
              title="Este curso aún no tiene quizzes"
              description="Crea el primer quiz para evaluar el avance del curso."
              icon="book"
            />
          </div>
        )}
      </AdminPanelCard>
    </AdminPageShell>
  );
}
