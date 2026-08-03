-- The only rate limiting in the app was a localStorage check on the client,
-- which is trivially bypassed (incognito window, or calling the Supabase
-- REST API directly). This adds a real counter table plus a reusable
-- check-and-increment function, enforced via BEFORE INSERT triggers on the
-- two public write endpoints most exposed to abuse (event registrations,
-- contact messages). Because the check runs as a database trigger, it
-- applies no matter which client path is used to reach the table, not just
-- the app's own forms.

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_key_created_at_idx
  on public.rate_limit_events (key, created_at desc);

alter table public.rate_limit_events enable row level security;
-- Intentionally no policies: this table is only ever touched through the
-- SECURITY DEFINER function below, never directly by anon/authenticated.

create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.rate_limit_events
  where key = p_key
    and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from public.rate_limit_events
  where key = p_key
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_events (key) values (p_key);
  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;

create or replace function public.enforce_event_registration_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_rate_limit('event_registration:' || lower(new.email), 5, 3600) then
    raise exception 'Demasiadas inscripciones desde este correo. Intenta más tarde.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger event_registrations_rate_limit
  before insert on public.event_registrations
  for each row execute function public.enforce_event_registration_rate_limit();

create or replace function public.enforce_contact_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_rate_limit('contact_message:' || lower(new.email), 5, 3600) then
    raise exception 'Demasiados mensajes enviados desde este correo. Intenta más tarde.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger contact_messages_rate_limit
  before insert on public.contact_messages
  for each row execute function public.enforce_contact_message_rate_limit();
