-- "Users can update own profile" only checks row ownership
-- (auth.uid() = id) — Postgres RLS controls which ROWS a policy allows,
-- not which COLUMNS. With no other guard, any signed-up member could call
-- supabase.from("profiles").update({ role: "admin" }).eq("id", myOwnId})
-- directly against the Supabase API and self-promote to admin, which then
-- passes every public.is_admin() check added in the previous two
-- migrations. No app code writes "role" via update today (only the
-- register/registration upsert sets it, always hardcoded to 'user'), so
-- this closes a real, currently-unused-by-the-app but directly exploitable
-- privilege escalation path.
--
-- A trigger is used instead of a CHECK constraint because it needs to
-- compare OLD vs NEW, and instead of a column-level REVOKE because it must
-- still allow the operator to promote/demote admins directly from the
-- Supabase dashboard (which runs as postgres/service_role, not
-- "authenticated") — auth.role() lets the trigger tell those two contexts
-- apart and only block the self-service path.

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() = 'authenticated' then
    raise exception 'No autorizado para cambiar el rol de un perfil.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger prevent_profile_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_self_role_escalation();
