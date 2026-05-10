import QuizEditorForm from "../../QuizEditorForm";
import {
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";

type Props = {
  params: Promise<{
    id: string;
    quizId: string;
  }>;
};

export default async function EditarQuizPage({ params }: Props) {
  const { id, quizId } = await params;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Evaluación"
        title="Editar quiz"
        subtitle="Ajusta el quiz, sus preguntas y las respuestas correctas."
        icon="check"
      />

      <QuizEditorForm courseId={id} quizId={quizId} mode="edit" />
    </AdminPageShell>
  );
}
