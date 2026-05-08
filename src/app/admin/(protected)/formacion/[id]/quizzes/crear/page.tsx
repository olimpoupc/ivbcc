import QuizEditorForm from "../QuizEditorForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CrearQuizPage({ params }: Props) {
  const { id } = await params;

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Crear quiz</h1>
        <p className="mt-1 text-gray-500">
          Configura el quiz, sus preguntas y las opciones de respuesta.
        </p>
      </div>

      <QuizEditorForm courseId={id} mode="create" />
    </main>
  );
}
