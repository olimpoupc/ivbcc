import QuizEditorForm from "../../QuizEditorForm";

type Props = {
  params: Promise<{
    id: string;
    quizId: string;
  }>;
};

export default async function EditarQuizPage({ params }: Props) {
  const { id, quizId } = await params;

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Editar quiz</h1>
        <p className="mt-1 text-gray-500">
          Ajusta el quiz, sus preguntas y las respuestas correctas.
        </p>
      </div>

      <QuizEditorForm courseId={id} quizId={quizId} mode="edit" />
    </main>
  );
}
