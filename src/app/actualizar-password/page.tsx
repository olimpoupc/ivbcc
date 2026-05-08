import UpdatePasswordForm from "./UpdatePasswordForm";

export default function ActualizarPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="text-center text-3xl font-bold text-gray-950">
          Actualizar contraseña
        </h1>

        <p className="mt-2 text-center text-sm text-gray-600">
          Crea una nueva contraseña para continuar con tu cuenta.
        </p>

        <div className="mt-8">
          <UpdatePasswordForm />
        </div>
      </section>
    </main>
  );
}
