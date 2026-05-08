import Link from "next/link";
import PublicLoginForm from "./PublicLoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="text-center text-3xl font-bold text-gray-950">
          Iniciar sesión
        </h1>

        <p className="mt-2 text-center text-sm text-gray-600">
          Accede a tu experiencia de formación de IVBCC.
        </p>

        <div className="mt-8">
          <PublicLoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Aún no tienes cuenta?{" "}
          <Link
            href="/registro"
            className="font-semibold text-[var(--ivbcc-navy)] hover:underline"
          >
            Regístrate
          </Link>
        </p>
      </section>
    </main>
  );
}
