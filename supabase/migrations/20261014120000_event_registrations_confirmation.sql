-- Fase 1 · Migración 1 de 2 (ADITIVA): confirmación por correo, asistencia,
-- consentimiento y mensajes a inscritos.
--
-- Se puede aplicar ANTES de desplegar el código nuevo: el código actual sigue
-- insertando con el cliente anónimo y sus filas quedan en 'pending' sin token
-- (la migración 2 las pasa a 'confirmed' al cerrar el INSERT público).

-- 1) Nuevas columnas en event_registrations.
--    status se crea con default 'confirmed' para que las filas EXISTENTES
--    queden confirmadas; después el default pasa a 'pending'.
alter table public.event_registrations
  add column status text not null default 'confirmed',
  add column confirmation_token_hash text,
  add column confirmation_expires_at timestamptz,
  add column confirmed_at timestamptz,
  add column checked_in_at timestamptz,
  add column checked_in_by uuid references auth.users(id) on delete set null,
  add column marketing_consent boolean not null default false,
  add column consent_at timestamptz,
  -- Hash del token del enlace "Darme de baja" de los mensajes a inscritos (fase 2).
  add column unsubscribe_token_hash text;

update public.event_registrations
  set confirmed_at = created_at
  where confirmed_at is null;

alter table public.event_registrations
  alter column status set default 'pending',
  add constraint event_registrations_status_check
    check (status in ('pending', 'confirmed', 'cancelled')),
  add constraint event_registrations_checkin_requires_confirmed
    check (checked_in_at is null or status = 'confirmed');

create unique index event_registrations_confirmation_token_hash_key
  on public.event_registrations (confirmation_token_hash)
  where confirmation_token_hash is not null;

create unique index event_registrations_unsubscribe_token_hash_key
  on public.event_registrations (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;

create index event_registrations_event_id_status_idx
  on public.event_registrations (event_id, status);

-- 2) Mientras exista el INSERT público (lo elimina la migración 2), un
--    visitante no puede insertarse ya confirmado, con asistencia o con token.
drop policy if exists "Public can register for open events" on public.event_registrations;

create policy "Public can register for open events"
  on public.event_registrations
  as permissive
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and confirmation_token_hash is null
    and confirmed_at is null
    and checked_in_at is null
    and checked_in_by is null
    and unsubscribe_token_hash is null
    and exists (
      select 1
      from public.events e
      where e.id = event_registrations.event_id
        and e.status = 'published'
        and e.registration_enabled = true
        and e.event_date > now()
    )
  );

-- Los administradores marcan asistencia desde el panel (su sesión + RLS).
create policy "Admins can update event registrations"
  on public.event_registrations
  as permissive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3) Correos que pidieron la baja (siempre en minúscula).
create table public.email_suppressions (
  email text primary key check (email = lower(email) and char_length(email) between 3 and 254),
  created_at timestamptz not null default now()
);

alter table public.email_suppressions enable row level security;

create policy "Admins can read email suppressions"
  on public.email_suppressions
  as permissive
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can delete email suppressions"
  on public.email_suppressions
  as permissive
  for delete
  to authenticated
  using (public.is_admin());

grant select, delete on table public.email_suppressions to authenticated;
grant all on table public.email_suppressions to service_role;

-- 4) Mensajes enviados a los inscritos de un evento.
create table public.event_broadcasts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 1 and 200),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  recipients_count integer not null default 0 check (recipients_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0)
);

create index event_broadcasts_event_id_created_at_idx
  on public.event_broadcasts (event_id, created_at desc);

alter table public.event_broadcasts enable row level security;

create policy "Admins can read event broadcasts"
  on public.event_broadcasts
  as permissive
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can create event broadcasts"
  on public.event_broadcasts
  as permissive
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update event broadcasts"
  on public.event_broadcasts
  as permissive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on table public.event_broadcasts to authenticated;
grant all on table public.event_broadcasts to service_role;

-- 5) La vista admin expone el estado y la asistencia (columnas nuevas al
--    final: create or replace view solo admite agregar columnas al final).
create or replace view public.admin_event_registrations_view
  with (security_invoker = true) as
select
  er.id,
  er.event_id,
  er.full_name,
  er.email,
  er.phone,
  er.created_at,
  e.title as event_title,
  er.status,
  er.confirmed_at,
  er.checked_in_at,
  er.marketing_consent
from public.event_registrations er
join public.events e on e.id = er.event_id;
