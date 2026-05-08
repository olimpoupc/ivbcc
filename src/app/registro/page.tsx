import Link from "next/link";
import PublicRegisterForm from "./PublicRegisterForm";

export default function RegistroPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <section className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 shadow-md">
        <h1 className="text-center text-3xl font-bold text-gray-950">
          Crear cuenta
        </h1>

        <p className="mt-2 text-center text-sm text-gray-600">
          Regístrate para avanzar en tu proceso de formación.
        </p>

        <div className="mt-8">
          <PublicRegisterForm />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--ivbcc-navy)] hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
