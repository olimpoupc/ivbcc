import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
      <section className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          Panel Administrativo
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Iglesia Valle de Bendición Cruzada Cristiana
        </p>

        <AdminLoginForm />
      </section>
    </main>
  );
}