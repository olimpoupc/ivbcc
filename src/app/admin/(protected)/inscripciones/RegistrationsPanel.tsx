"use client";

import { useMemo, useState } from "react";

type EventRegistrationRow = {
  id: string;
  type: "Evento";
  name: string;
  email: string;
  phone: string;
  item: string;
  date: string;
};

type CourseEnrollmentRow = {
  id: string;
  type: "Curso";
  name: string;
  email: string;
  phone: string;
  item: string;
  date: string;
};

type RegistrationRow = EventRegistrationRow | CourseEnrollmentRow;

type Props = {
  eventRows: EventRegistrationRow[];
  courseRows: CourseEnrollmentRow[];
};

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function RegistrationsPanel({ eventRows, courseRows }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "events" | "courses">("all");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEventRows = useMemo(() => {
    return eventRows.filter((row) => {
      if (!normalizedQuery) return true;

      return [row.name, row.email, row.item]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [eventRows, normalizedQuery]);

  const filteredCourseRows = useMemo(() => {
    return courseRows.filter((row) => {
      if (!normalizedQuery) return true;

      return [row.name, row.item]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [courseRows, normalizedQuery]);

  const exportRows = useMemo<RegistrationRow[]>(() => {
    if (filter === "events") return filteredEventRows;
    if (filter === "courses") return filteredCourseRows;
    return [...filteredEventRows, ...filteredCourseRows];
  }, [filter, filteredEventRows, filteredCourseRows]);

  function handleExportCsv() {
    const header = "Tipo;Nombre/Usuario;Correo;Telefono;Evento/Curso;Fecha";
    const rows = exportRows.map((row) =>
      [
        row.type,
        row.name,
        row.email || "",
        row.phone || "",
        row.item,
        row.date,
      ]
        .map((value) => escapeCsvValue(value))
        .join(";")
    );

    const csvContent = ["sep=;", header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inscripciones-ivbcc.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Buscar inscripciones
            </label>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca por nombre, correo, evento o curso"
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Filtrar
              </label>
              <div className="flex rounded-lg border bg-gray-50 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-md px-4 py-2 font-medium ${
                    filter === "all" ? "bg-white text-gray-950 shadow-sm" : "text-gray-600"
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("events")}
                  className={`rounded-md px-4 py-2 font-medium ${
                    filter === "events" ? "bg-white text-gray-950 shadow-sm" : "text-gray-600"
                  }`}
                >
                  Eventos
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("courses")}
                  className={`rounded-md px-4 py-2 font-medium ${
                    filter === "courses" ? "bg-white text-gray-950 shadow-sm" : "text-gray-600"
                  }`}
                >
                  Cursos
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-lg bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </section>

      {(filter === "all" || filter === "events") && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-950">Inscripciones a eventos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Registros públicos recibidos desde los formularios de eventos.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4">Nombre</th>
                  <th className="pb-3 pr-4">Correo</th>
                  <th className="pb-3 pr-4">Teléfono</th>
                  <th className="pb-3 pr-4">Evento</th>
                  <th className="pb-3">Fecha de inscripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEventRows.map((registration) => (
                  <tr key={registration.id} className="align-top text-gray-700">
                    <td className="py-4 pr-4 font-medium">{registration.name}</td>
                    <td className="py-4 pr-4">{registration.email}</td>
                    <td className="py-4 pr-4">{registration.phone || "Sin teléfono"}</td>
                    <td className="py-4 pr-4">{registration.item}</td>
                    <td className="py-4">{registration.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEventRows.length === 0 && (
            <p className="pt-6 text-center text-sm text-gray-500">
              No se encontraron inscripciones a eventos con ese criterio.
            </p>
          )}
        </section>
      )}

      {(filter === "all" || filter === "courses") && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-950">Inscripciones a cursos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Usuarios inscritos en los cursos de formación.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4">Usuario</th>
                  <th className="pb-3 pr-4">Curso</th>
                  <th className="pb-3">Fecha de inscripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCourseRows.map((enrollment) => (
                  <tr key={enrollment.id} className="align-top text-gray-700">
                    <td className="py-4 pr-4 font-medium">{enrollment.name}</td>
                    <td className="py-4 pr-4">{enrollment.item}</td>
                    <td className="py-4">{enrollment.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCourseRows.length === 0 && (
            <p className="pt-6 text-center text-sm text-gray-500">
              No se encontraron inscripciones a cursos con ese criterio.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
