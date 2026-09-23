-- prevent_self_role_escalation (20260803100000) is a BEFORE UPDATE trigger,
-- so it only protects rows that already exist. The policy "Authenticated
-- users can insert own profile" only checks auth.uid() = id — it says
-- nothing about the role column — and no trigger creates a profile row when
-- someone signs up. A freshly signed-up member who has no profiles row yet
-- could therefore call
--   supabase.from("profiles").insert({ id: <own id>, role: "admin" })
-- directly against the API, get an admin row, and pass every
-- public.is_admin() check. Confirmed with the RLS integration tests
-- (src/lib/rls-integration, case 3b).
--
-- Same fix pattern as the UPDATE guard, same way of telling the two paths
-- apart: when auth.role() = 'authenticated' (a signed-in member going
-- through PostgREST) the inserted role is forced to 'user'; service_role and
-- the dashboard/SQL editor (postgres) are not "authenticated", so operators
-- can still create admin profiles. Forcing (instead of raising) keeps the
-- app's register/registration upsert working — it already sends 'user'.

create or replace function public.force_profile_role_on_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' then
    new.role := 'user';
  end if;
  return new;
end;
$$;

create trigger force_profile_role_on_insert
  before insert on public.profiles
  for each row
  execute function public.force_profile_role_on_insert();
