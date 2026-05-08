import RecoverPasswordForm from "./RecoverPasswordForm";

export default function RecuperarPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="text-center text-3xl font-bold text-gray-950">
          Recuperar contraseña
        </h1>

        <p className="mt-2 text-center text-sm text-gray-600">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <div className="mt-8">
          <RecoverPasswordForm />
        </div>
      </section>
    </main>
  );
}
