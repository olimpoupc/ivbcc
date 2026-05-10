import QuizEditorForm from "../QuizEditorForm";
import {
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CrearQuizPage({ params }: Props) {
  const { id } = await params;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Evaluación"
        title="Crear quiz"
        subtitle="Configura el quiz, sus preguntas y las opciones de respuesta."
        icon="check"
      />

      <QuizEditorForm courseId={id} mode="create" />
    </AdminPageShell>
  );
}
