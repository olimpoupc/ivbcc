import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestUser,
  createAnonClient,
  createServiceClient,
  createTestUser,
  expectInsertDenied,
  expectNoRowsAffectedOrDenied,
  must,
  mustRow,
} from "./helpers";

// Requiere `npx supabase start` (Docker) con TODAS las migraciones aplicadas
// (`npx supabase migration up --local`). No usa mocks: cada llamada pasa por
// PostgREST + RLS + triggers reales de Postgres.

const runId = randomUUID().slice(0, 8);

const service = createServiceClient();
const anon = createAnonClient();

let userA: TestUser; // miembro normal, dueno de attemptA
let userB: TestUser; // otro miembro normal (el "atacante" / "otro usuario")
let admin: TestUser;
let promotee: TestUser; // sujeto de la prueba de control "service_role si puede cambiar role"
let noProfile: TestUser; // miembro sin fila en profiles todavia

let course: { id: string; title: string };
let lessonId: string;
let quiz: { id: string };
let questionId: string;
let attemptA: { id: string; score: number };
let eventId: string;

const cleanup: Array<() => Promise<unknown>> = [];

async function rowById(table: string, id: string) {
  return service.from(table).select("*").eq("id", id).maybeSingle();
}

async function rowCount(table: string): Promise<number> {
  const { count, error } = await service
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`count(${table}): ${error.message}`);
  return count ?? 0;
}

beforeAll(async () => {
  const ping = await service.from("courses").select("id").limit(1);
  if (ping.error) {
    throw new Error(
      `Supabase local no responde (${ping.error.message}). Ejecuta \`npx supabase start\` y \`npx supabase migration up --local\`.`,
    );
  }

  [userA, userB, admin, promotee, noProfile] = await Promise.all([
    createTestUser(service, "a", runId, "user"),
    createTestUser(service, "b", runId, "user"),
    createTestUser(service, "admin", runId, "admin"),
    createTestUser(service, "promotee", runId, "user"),
    createTestUser(service, "noprofile", runId, null),
  ]);
  for (const u of [userA, userB, admin, promotee, noProfile]) {
    cleanup.push(async () => service.auth.admin.deleteUser(u.id));
  }

  const courseRow = mustRow(
    await service
      .from("courses")
      .insert({
        title: `RLS curso ${runId}`,
        slug: `rls-${runId}-course`,
        description: "d",
        status: "published",
      })
      .select("id, title")
      .single(),
    "curso",
  );
  course = courseRow;
  // borrar el curso arrastra (ON DELETE CASCADE) lecciones, quizzes,
  // preguntas, opciones, intentos y progreso
  cleanup.push(async () => service.from("courses").delete().eq("id", course.id));

  lessonId = mustRow(
    await service
      .from("lessons")
      .insert({ course_id: course.id, title: "L1", content: "x" })
      .select("id")
      .single(),
    "leccion",
  ).id;

  quiz = mustRow(
    await service
      .from("quizzes")
      .insert({
        course_id: course.id,
        lesson_id: lessonId,
        title: `RLS quiz ${runId}`,
        status: "published",
      })
      .select("id")
      .single(),
    "quiz",
  );

  questionId = mustRow(
    await service
      .from("quiz_questions")
      .insert({ quiz_id: quiz.id, question_text: "Pregunta?", order: 1 })
      .select("id")
      .single(),
    "pregunta",
  ).id;

  must(
    await service.from("quiz_options").insert([
      { question_id: questionId, option_text: "Correcta", is_correct: true, order: 1 },
      { question_id: questionId, option_text: "Incorrecta", is_correct: false, order: 2 },
    ]),
    "opciones",
  );

  attemptA = mustRow(
    await service
      .from("quiz_attempts")
      .insert({ quiz_id: quiz.id, user_id: userA.id, score: 3, total_questions: 5 })
      .select("id, score")
      .single(),
    "intento de A",
  );

  eventId = mustRow(
    await service
      .from("events")
      .insert({
        title: `RLS evento ${runId}`,
        slug: `rls-${runId}-event-base`,
        description: "d",
        event_date: new Date().toISOString(),
        status: "published",
      })
      .select("id")
      .single(),
    "evento base",
  ).id;
  cleanup.push(async () => service.from("events").delete().eq("id", eventId));
}, 60_000);

afterAll(async () => {
  for (const fn of cleanup.reverse()) {
    try {
      await fn();
    } catch {
      // limpieza best-effort: el stack local es desechable
    }
  }
}, 60_000);

// ---------------------------------------------------------------------------
describe("1. UPDATE sobre courses por un usuario autenticado NO-admin", () => {
  it("BLOQUEO: un miembro normal no puede actualizar un curso", async () => {
    const res = await userA.client
      .from("courses")
      .update({ title: "HACKED" })
      .eq("id", course.id)
      .select();

    expectNoRowsAffectedOrDenied(res);

    const after = must(await rowById("courses", course.id), "releer curso");
    expect(after?.title).toBe(course.title);
  });

  it("BLOQUEO: un miembro normal tampoco puede publicar/despublicar (status)", async () => {
    const res = await userA.client
      .from("courses")
      .update({ status: "draft" })
      .eq("id", course.id)
      .select();

    expectNoRowsAffectedOrDenied(res);

    const after = must(await rowById("courses", course.id), "releer curso");
    expect(after?.status).toBe("published");
  });

  it("BLOQUEO (extra): un miembro normal no puede insertar ni borrar cursos", async () => {
    const before = await rowCount("courses");

    const ins = await userA.client.from("courses").insert({
      title: "HACKED",
      slug: `rls-${runId}-hacked`,
      description: "d",
    });
    expectInsertDenied(ins);

    const del = await userA.client
      .from("courses")
      .delete()
      .eq("id", course.id)
      .select();
    expectNoRowsAffectedOrDenied(del);

    expect(await rowCount("courses")).toBe(before);
    expect(must(await rowById("courses", course.id), "releer curso")).not.toBeNull();
  });

  it("CONTROL: un admin SI puede actualizar un curso", async () => {
    const newTitle = `RLS curso editado ${runId}`;
    const res = await admin.client
      .from("courses")
      .update({ title: newTitle })
      .eq("id", course.id)
      .select("id, title");

    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0].title).toBe(newTitle);

    const after = must(await rowById("courses", course.id), "releer curso");
    expect(after?.title).toBe(newTitle);

    // deja el curso como estaba para no contaminar otros casos
    must(
      await service.from("courses").update({ title: course.title }).eq("id", course.id),
      "restaurar titulo",
    );
  });
});

// ---------------------------------------------------------------------------
describe("2. SELECT sobre quiz_options (no debe filtrar is_correct)", () => {
  it("precondicion: las opciones existen (si no, un resultado vacio no probaria nada)", async () => {
    const rows = mustRow(
      await service.from("quiz_options").select("id, is_correct").eq("question_id", questionId),
      "opciones via service_role",
    );
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.is_correct === true)).toBe(true);
  });

  it("BLOQUEO: un miembro normal no puede leer quiz_options de un quiz publicado", async () => {
    const res = await userA.client
      .from("quiz_options")
      .select("id, option_text, is_correct")
      .eq("question_id", questionId);

    if (res.error) {
      expect(res.error.code).toBe("42501");
    } else {
      expect(res.data).toEqual([]);
    }
  });

  it("BLOQUEO: no se puede usar is_correct como oraculo (.eq('is_correct', true))", async () => {
    const res = await userA.client
      .from("quiz_options")
      .select("id, is_correct")
      .eq("is_correct", true);

    if (res.error) {
      expect(res.error.code).toBe("42501");
    } else {
      expect(res.data).toEqual([]);
    }
  });

  it("BLOQUEO: tampoco por embed desde quiz_questions (ruta realista de fuga)", async () => {
    const res = await userA.client
      .from("quiz_questions")
      .select("id, question_text, quiz_options(id, is_correct)")
      .eq("id", questionId);

    expect(res.error).toBeNull();
    // la pregunta SI es publica (quiz publicado)...
    expect(res.data).toHaveLength(1);
    // ...pero sus opciones (con is_correct) no deben venir
    expect(res.data?.[0].quiz_options).toEqual([]);
  });

  it("BLOQUEO: un visitante anonimo tampoco puede leer quiz_options", async () => {
    const res = await anon
      .from("quiz_options")
      .select("id, is_correct")
      .eq("question_id", questionId);

    if (res.error) {
      expect(res.error.code).toBe("42501");
    } else {
      expect(res.data).toEqual([]);
    }
  });

  it("CONTROL: un admin SI ve las opciones y su is_correct", async () => {
    const res = await admin.client
      .from("quiz_options")
      .select("option_text, is_correct")
      .eq("question_id", questionId)
      .order("order");

    expect(res.error).toBeNull();
    expect(res.data).toEqual([
      { option_text: "Correcta", is_correct: true },
      { option_text: "Incorrecta", is_correct: false },
    ]);
  });
});

// ---------------------------------------------------------------------------
describe("3. Escalada de privilegios: UPDATE de profiles.role (trigger prevent_self_role_escalation)", () => {
  it("BLOQUEO: un usuario no puede ponerse role='admin' en su propia fila", async () => {
    const res = await userA.client
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userA.id)
      .select();

    expect(res.error).not.toBeNull();
    expect(res.error?.code).toBe("42501");
    expect(res.error?.message).toContain("No autorizado para cambiar el rol");

    const after = must(await rowById("profiles", userA.id), "releer perfil");
    expect(after?.role).toBe("user");
  });

  it("BLOQUEO: el intento es atomico (role + first_name en el mismo UPDATE no se aplica a medias)", async () => {
    const before = must(await rowById("profiles", userA.id), "perfil antes");

    const res = await userA.client
      .from("profiles")
      .update({ role: "admin", first_name: "COLADO" })
      .eq("id", userA.id)
      .select();

    expect(res.error?.code).toBe("42501");
    const after = must(await rowById("profiles", userA.id), "perfil despues");
    expect(after?.role).toBe("user");
    expect(after?.first_name).toBe(before?.first_name);
  });

  it("BLOQUEO: upsert sobre su fila existente tampoco permite subir a admin", async () => {
    const res = await userA.client
      .from("profiles")
      .upsert({ id: userA.id, role: "admin" })
      .select();

    // Desde 20260803140000 el BEFORE INSERT fuerza role='user' en la fila
    // propuesta del upsert, asi que ya no hay error: lo que importa es que el
    // rol guardado nunca llegue a 'admin'.
    expect(res.error, JSON.stringify(res.error)).toBeNull();
    expect(must(await rowById("profiles", userA.id), "releer perfil")?.role).toBe("user");
  });

  it("BLOQUEO: no puede cambiar el role de OTRO usuario", async () => {
    const res = await userA.client
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userB.id)
      .select();

    expectNoRowsAffectedOrDenied(res);
    expect(must(await rowById("profiles", userB.id), "releer perfil B")?.role).toBe("user");
  });

  it("BLOQUEO: tras intentar escalar, sigue sin poder actuar como admin (no puede editar courses)", async () => {
    const res = await userA.client
      .from("courses")
      .update({ title: "HACKED" })
      .eq("id", course.id)
      .select();

    expectNoRowsAffectedOrDenied(res);
    expect(must(await rowById("courses", course.id), "releer curso")?.title).toBe(course.title);
  });

  it("CONTROL: el usuario SI puede editar sus otros campos (first_name)", async () => {
    const res = await userA.client
      .from("profiles")
      .update({ first_name: "Nombre Nuevo" })
      .eq("id", userA.id)
      .select("id, first_name, role");

    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0].first_name).toBe("Nombre Nuevo");
    expect(res.data?.[0].role).toBe("user");
  });

  it("CONTROL: service_role (dashboard/operador) SI puede promover y degradar admins", async () => {
    const up = await service
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", promotee.id)
      .select("role");
    expect(up.error).toBeNull();
    expect(up.data?.[0].role).toBe("admin");

    const down = await service
      .from("profiles")
      .update({ role: "user" })
      .eq("id", promotee.id)
      .select("role");
    expect(down.error).toBeNull();
    expect(down.data?.[0].role).toBe("user");
  });
});

describe("3b. SONDEO ADICIONAL (no pedido): INSERT de un perfil propio con role='admin'", () => {
  // El trigger prevent_self_role_escalation es "before update". La politica
  // "Authenticated users can insert own profile" solo exige auth.uid() = id.
  // Como no hay trigger que cree el perfil al registrarse, un usuario recien
  // registrado que aun no tiene fila podria intentar insertarse a si mismo
  // con role='admin', esquivando el trigger. Esta prueba comprueba si se puede.
  // Corregido en 20260803140000 (force_profile_role_on_insert): el INSERT ya
  // no se rechaza, se neutraliza: el perfil queda con role='user'.
  it("BLOQUEO: un usuario sin perfil no puede insertarse a si mismo con role='admin' (queda como 'user')", async () => {
    const res = await noProfile.client
      .from("profiles")
      .insert({ id: noProfile.id, role: "admin", first_name: "Sondeo" });

    const stored = must(await rowById("profiles", noProfile.id), "releer perfil");

    expect(
      stored?.role,
      `ESCALADA POSIBLE: el perfil quedo guardado con role='${stored?.role}' (error devuelto: ${JSON.stringify(res.error)})`,
    ).toBe("user");
  });
});

// ---------------------------------------------------------------------------
describe("4. quiz_attempts de OTRO usuario", () => {
  it("BLOQUEO: B no puede LEER los intentos de A (filtrando por user_id de A)", async () => {
    const res = await userB.client
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", userA.id);

    if (res.error) {
      expect(res.error.code).toBe("42501");
    } else {
      expect(res.data).toEqual([]);
    }
    // precondicion: el intento de A existe de verdad
    expect(must(await rowById("quiz_attempts", attemptA.id), "releer intento")).not.toBeNull();
  });

  it("BLOQUEO: B no ve el intento de A ni siquiera sin filtro (select * completo)", async () => {
    const res = await userB.client.from("quiz_attempts").select("id, user_id");

    expect(res.error).toBeNull();
    expect(res.data?.some((r) => r.user_id === userA.id)).toBe(false);
    expect(res.data?.some((r) => r.id === attemptA.id)).toBe(false);
  });

  it("BLOQUEO: B no puede MODIFICAR el score de A", async () => {
    const res = await userB.client
      .from("quiz_attempts")
      .update({ score: 100, total_questions: 100 })
      .eq("id", attemptA.id)
      .select();

    expectNoRowsAffectedOrDenied(res);
    const after = must(await rowById("quiz_attempts", attemptA.id), "releer intento");
    expect(after?.score).toBe(attemptA.score);
  });

  it("BLOQUEO: B no puede BORRAR el intento de A", async () => {
    const res = await userB.client
      .from("quiz_attempts")
      .delete()
      .eq("id", attemptA.id)
      .select();

    expectNoRowsAffectedOrDenied(res);
    expect(must(await rowById("quiz_attempts", attemptA.id), "releer intento")).not.toBeNull();
  });

  it("BLOQUEO: B no puede INSERTAR un intento a nombre de A", async () => {
    const before = await rowCount("quiz_attempts");

    const res = await userB.client
      .from("quiz_attempts")
      .insert({ quiz_id: quiz.id, user_id: userA.id, score: 5, total_questions: 5 });

    expectInsertDenied(res);
    expect(await rowCount("quiz_attempts")).toBe(before);
  });

  it("BLOQUEO (extra): ni siquiera A puede editar su PROPIO score (no hay politica UPDATE)", async () => {
    const res = await userA.client
      .from("quiz_attempts")
      .update({ score: 5 })
      .eq("id", attemptA.id)
      .select();

    expectNoRowsAffectedOrDenied(res);
    const after = must(await rowById("quiz_attempts", attemptA.id), "releer intento");
    expect(after?.score).toBe(attemptA.score);
  });

  it("CONTROL: A SI puede leer su propio intento", async () => {
    const res = await userA.client
      .from("quiz_attempts")
      .select("id, score")
      .eq("id", attemptA.id);

    expect(res.error).toBeNull();
    expect(res.data).toEqual([{ id: attemptA.id, score: attemptA.score }]);
  });

  it("CONTROL: A SI puede insertar un intento propio", async () => {
    const res = await userA.client
      .from("quiz_attempts")
      .insert({ quiz_id: quiz.id, user_id: userA.id, score: 1, total_questions: 5 })
      .select("id, user_id");

    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0].user_id).toBe(userA.id);
  });

  it("CONTROL: un admin SI puede leer los intentos de otros usuarios", async () => {
    const res = await admin.client
      .from("quiz_attempts")
      .select("id, user_id")
      .eq("id", attemptA.id);

    expect(res.error).toBeNull();
    expect(res.data).toEqual([{ id: attemptA.id, user_id: userA.id }]);
  });
});

// ---------------------------------------------------------------------------
type TableSpec = {
  table: string;
  /** Payload valido para un INSERT (si la tabla no admite escritura publica). */
  insert: (tag: string) => Record<string, unknown>;
  /** Cambio que un atacante intentaria aplicar sobre una fila existente. */
  patch: Record<string, unknown>;
  /** INSERT anonimo permitido por diseno (formularios publicos): no se prueba el bloqueo del INSERT. */
  publicInsert?: boolean;
};

// lessons/quiz_questions/quiz_options tienen UNIQUE (padre, order): cada fila
// sembrada o de sondeo necesita un order distinto de las filas base (order=1/2).
const orderFor = (tag: string) => (tag === "seed" ? 10 : 11);

const specs = (): TableSpec[] => [
  { table: "courses", patch: { title: "HACKED" }, insert: (t) => ({ title: `RLS ${t}`, slug: `rls-${runId}-c-${t}`, description: "d" }) },
  { table: "lessons", patch: { title: "HACKED" }, insert: (t) => ({ course_id: course.id, title: `RLS ${t}`, content: "x", order: orderFor(t) }) },
  { table: "quizzes", patch: { title: "HACKED" }, insert: (t) => ({ course_id: course.id, title: `RLS ${t}` }) },
  { table: "quiz_questions", patch: { question_text: "HACKED" }, insert: (t) => ({ quiz_id: quiz.id, question_text: `RLS ${t}`, order: orderFor(t) }) },
  { table: "quiz_options", patch: { is_correct: true, option_text: "HACKED" }, insert: (t) => ({ question_id: questionId, option_text: `RLS ${t}`, is_correct: true, order: orderFor(t) }) },
  { table: "quiz_attempts", patch: { score: 100 }, insert: () => ({ quiz_id: quiz.id, user_id: userA.id, score: 5, total_questions: 5 }) },
  { table: "news", patch: { title: "HACKED" }, insert: (t) => ({ title: `RLS ${t}`, slug: `rls-${runId}-n-${t}`, summary: "s", content: "c" }) },
  { table: "events", patch: { title: "HACKED" }, insert: (t) => ({ title: `RLS ${t}`, slug: `rls-${runId}-e-${t}`, description: "d", event_date: new Date().toISOString() }) },
  { table: "course_progress", patch: { completed: true }, insert: () => ({ user_id: userA.id, course_id: course.id, lesson_id: lessonId }) },
  { table: "course_enrollments", patch: { created_at: "2000-01-01T00:00:00Z" }, insert: () => ({ user_id: userA.id, course_id: course.id }) },
  { table: "course_certificates", patch: { student_name: "HACKED" }, insert: (t) => ({ code: `RLS-${runId}-${t}`, user_id: userA.id, course_id: course.id, student_name: "S", course_title: "T" }) },
  { table: "publications", patch: { title: "HACKED" }, insert: (t) => ({ title: `RLS ${t}`, slug: `rls-${runId}-p-${t}`, category: "devotional" }) },
  { table: "live_streams", patch: { title: "HACKED" }, insert: (t) => ({ title: `RLS ${t}`, slug: `rls-${runId}-l-${t}`, youtube_url: "https://example.test", category: "live" }) },
  { table: "donation_methods", patch: { title: "HACKED" }, insert: (t) => ({ title: `RLS ${t}`, method_type: "other" }) },
  { table: "help_center_items", patch: { title: "HACKED" }, insert: (t) => ({ title: `RLS ${t}`, message: "m" }) },
  // escritura publica por diseno (formularios): solo se prueba UPDATE/DELETE
  { table: "contact_messages", patch: { subject: "HACKED" }, publicInsert: true, insert: (t) => ({ full_name: "N", email: `n-${runId}@example.test`, subject: `RLS-TEST-${runId}-${t}`, message: "m" }) },
  { table: "event_registrations", patch: { full_name: "HACKED" }, publicInsert: true, insert: (t) => ({ event_id: eventId, full_name: `RLS-TEST-${runId}-${t}`, email: `n-${runId}@example.test` }) },
];

describe("5. Usuario NO autenticado (anon) escribiendo en tablas protegidas por RLS", () => {
  const seeded = new Map<string, Record<string, unknown>>();

  beforeAll(async () => {
    for (const spec of specs()) {
      const row = must(
        await service.from(spec.table).insert(spec.insert("seed")).select("*").single(),
        `sembrar ${spec.table}`,
      );
      seeded.set(spec.table, row);
      cleanup.push(async () => service.from(spec.table).delete().eq("id", row.id as string));
    }
  }, 60_000);

  it("precondicion: hay una fila sembrada por tabla (si no, 'no cambio nada' no probaria nada)", () => {
    expect(seeded.size).toBe(specs().length);
  });

  describe.each(specs().filter((s) => !s.publicInsert))("INSERT anon en $table", (spec) => {
    it("BLOQUEO: anon no puede insertar (42501)", async () => {
      const before = await rowCount(spec.table);
      const res = await anon.from(spec.table).insert(spec.insert("anon-probe"));
      expectInsertDenied(res);
      expect(await rowCount(spec.table)).toBe(before);
    });
  });

  describe.each(specs())("UPDATE/DELETE anon en $table", (spec) => {
    it("BLOQUEO: anon no puede actualizar filas existentes", async () => {
      const before = seeded.get(spec.table)!;
      const res = await anon
        .from(spec.table)
        .update(spec.patch)
        .eq("id", before.id as string)
        .select();

      expectNoRowsAffectedOrDenied(res);
      const after = must(await rowById(spec.table, before.id as string), "releer fila");
      expect(after).toEqual(before);
    });

    it("BLOQUEO: anon no puede borrar filas existentes", async () => {
      const before = seeded.get(spec.table)!;
      const res = await anon
        .from(spec.table)
        .delete()
        .eq("id", before.id as string)
        .select();

      expectNoRowsAffectedOrDenied(res);
      const after = must(await rowById(spec.table, before.id as string), "releer fila");
      expect(after).toEqual(before);
    });
  });

  describe("profiles y site_settings (filas ya existentes)", () => {
    it("BLOQUEO: anon no puede insertar un perfil (ni siquiera con role='user')", async () => {
      const res = await anon
        .from("profiles")
        .insert({ id: randomUUID(), role: "user" });
      expectInsertDenied(res);
    });

    it("BLOQUEO: anon no puede actualizar ni borrar el perfil de un usuario", async () => {
      const before = must(await rowById("profiles", userA.id), "perfil antes");

      const upd = await anon
        .from("profiles")
        .update({ role: "admin", first_name: "HACKED" })
        .eq("id", userA.id)
        .select();
      expectNoRowsAffectedOrDenied(upd);

      const del = await anon.from("profiles").delete().eq("id", userA.id).select();
      expectNoRowsAffectedOrDenied(del);

      expect(must(await rowById("profiles", userA.id), "perfil despues")).toEqual(before);
    });

    it("BLOQUEO: anon no puede modificar ni insertar site_settings", async () => {
      const existing = must(
        await service.from("site_settings").select("*").limit(1).maybeSingle(),
        "site_settings existente",
      );
      let row = existing;
      if (!row) {
        row = must(
          await service.from("site_settings").insert({ church_name: `RLS ${runId}` }).select("*").single(),
          "crear site_settings",
        );
        cleanup.push(async () => service.from("site_settings").delete().eq("id", row!.id));
      }

      const upd = await anon
        .from("site_settings")
        .update({ slogan: "HACKED" })
        .eq("id", row.id)
        .select();
      expectNoRowsAffectedOrDenied(upd);

      const ins = await anon.from("site_settings").insert({ church_name: "HACKED" });
      expectInsertDenied(ins);

      expect(must(await rowById("site_settings", row.id), "site_settings despues")).toEqual(row);
    });
  });

  describe("controles positivos (el cliente anon SI escribe/lee donde esta permitido)", () => {
    it("CONTROL: anon SI puede insertar en contact_messages (formulario publico)", async () => {
      const subject = `RLS-TEST-${runId}-anon-ok`;
      const res = await anon.from("contact_messages").insert({
        full_name: "Visitante",
        email: `visitante-${runId}@example.test`,
        subject,
        message: "hola",
      });
      expect(res.error).toBeNull();

      const stored = must(
        await service.from("contact_messages").select("id").eq("subject", subject),
        "releer contacto",
      );
      expect(stored).toHaveLength(1);
      await service.from("contact_messages").delete().eq("subject", subject);
    });

    it("CONTROL: anon SI puede leer un curso publicado (el cliente no esta 'roto')", async () => {
      const res = await anon.from("courses").select("id, title").eq("id", course.id);
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
    });

    it("CONTROL: un admin SI puede insertar/borrar en una tabla protegida (news)", async () => {
      const ins = await admin.client
        .from("news")
        .insert({ title: `RLS admin ${runId}`, slug: `rls-${runId}-admin-news`, summary: "s", content: "c" })
        .select("id");
      expect(ins.error).toBeNull();
      expect(ins.data).toHaveLength(1);
      const id = ins.data![0].id as string;

      const del = await admin.client.from("news").delete().eq("id", id).select("id");
      expect(del.error).toBeNull();
      expect(del.data).toHaveLength(1);
    });
  });
});
