import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Pruebas de integracion REALES contra el Supabase local (`supabase start`).
// Nunca lee NEXT_PUBLIC_SUPABASE_* ni SUPABASE_SERVICE_ROLE_KEY de .env.local
// (esos apuntan al proyecto remoto): usa variables RLS_TEST_* propias y, si no
// existen, las claves demo publicas que Supabase CLI documenta para el stack
// local. Ademas se niega a correr si la URL no es de esta maquina.
const LOCAL_DEMO_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_DEMO_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const SUPABASE_URL =
  process.env.RLS_TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.RLS_TEST_ANON_KEY ?? LOCAL_DEMO_ANON_KEY;
const SERVICE_ROLE_KEY =
  process.env.RLS_TEST_SERVICE_ROLE_KEY ?? LOCAL_DEMO_SERVICE_ROLE_KEY;

const LOCAL_HOSTNAMES = ["127.0.0.1", "localhost", "[::1]", "::1"];

export function assertLocalTarget() {
  const { hostname } = new URL(SUPABASE_URL);
  if (!LOCAL_HOSTNAMES.includes(hostname)) {
    throw new Error(
      `Las pruebas RLS solo corren contra Supabase local. RLS_TEST_SUPABASE_URL apunta a "${hostname}".`,
    );
  }
}

export type AnyClient = SupabaseClient;

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

export function createAnonClient(): AnyClient {
  assertLocalTarget();
  return createClient(SUPABASE_URL, ANON_KEY, clientOptions);
}

/** Bypasa RLS. Solo para sembrar datos y verificar el estado real de la BD. */
export function createServiceClient(): AnyClient {
  assertLocalTarget();
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, clientOptions);
}

export type TestUser = {
  id: string;
  email: string;
  client: AnyClient;
};

type ProfileRole = "admin" | "user";

type MaybeError = { code?: string; message: string } | null;

export function must<T>(res: { data: T; error: MaybeError }, what: string): T {
  if (res.error) {
    throw new Error(`Fallo el setup (${what}): ${res.error.message}`);
  }
  return res.data;
}

/** Como must(), pero ademas exige que haya una fila (para .single() en el setup). */
export function mustRow<T>(
  res: { data: T; error: MaybeError },
  what: string,
): NonNullable<T> {
  const data = must(res, what);
  if (data === null || data === undefined) {
    throw new Error(`Fallo el setup (${what}): no devolvio ninguna fila`);
  }
  return data;
}

/**
 * Crea un usuario real en auth.users y opcionalmente su fila en profiles
 * (no existe trigger que la cree al registrarse), y lo deja con sesion
 * iniciada en un cliente con la anon key: exactamente lo que ve PostgREST
 * cuando un miembro llama a la API directamente.
 */
export async function createTestUser(
  service: AnyClient,
  label: string,
  runId: string,
  profileRole: ProfileRole | null,
): Promise<TestUser> {
  const email = `rls-${label}-${runId}@example.test`;
  const password = `pw-${randomUUID()}`;

  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(
      `Fallo el setup (crear usuario ${label}): ${created.error?.message}`,
    );
  }
  const id = created.data.user.id;

  if (profileRole) {
    must(
      await service
        .from("profiles")
        .insert({ id, role: profileRole, first_name: `RLS ${label}` }),
      `perfil de ${label}`,
    );
  }

  const client = createAnonClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    throw new Error(
      `Fallo el setup (login ${label}): ${signedIn.error.message}`,
    );
  }

  return { id, email, client };
}

type WriteResult = { data: unknown[] | null; error: MaybeError };

/**
 * Un UPDATE/DELETE/SELECT bloqueado por RLS normalmente NO da error: Postgres
 * filtra las filas y PostgREST responde 200 con []. Se acepta como
 * "rechazado" solo (a) un 42501 explicito o (b) ninguna fila afectada. Nunca
 * basta con "no hubo error": el llamador ademas debe verificar el estado real.
 */
export function expectNoRowsAffectedOrDenied(res: WriteResult) {
  if (res.error) {
    if (res.error.code !== "42501") {
      throw new Error(
        `Error inesperado (no es 42501 / RLS): ${res.error.code} ${res.error.message}`,
      );
    }
    return;
  }
  if ((res.data ?? []).length !== 0) {
    throw new Error(
      `La operacion NO fue bloqueada: afecto/devolvio ${res.data?.length} fila(s): ${JSON.stringify(res.data)}`,
    );
  }
}

/** Un INSERT bloqueado por RLS SI da error 42501. Cualquier otro codigo no cuenta. */
export function expectInsertDenied(res: { error: MaybeError }) {
  if (!res.error) {
    throw new Error("El INSERT NO fue bloqueado (sin error).");
  }
  if (res.error.code !== "42501") {
    throw new Error(
      `El INSERT fallo, pero no por RLS: ${res.error.code} ${res.error.message}`,
    );
  }
}
