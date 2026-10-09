-- Migración para el registro y gestión de donaciones

-- 1. Tabla public.donations
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  first_name text not null check (char_length(trim(first_name)) between 2 and 80),
  last_name text not null check (char_length(trim(last_name)) between 2 and 80),
  email text check (email is null or email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone text check (phone is null or char_length(phone) <= 20),
  amount integer not null check (amount between 1000 and 20000000),
  donation_method_id uuid references public.donation_methods(id) on delete set null,
  method_title text not null check (char_length(trim(method_title)) > 0),
  receipt_path text,
  upload_token text not null,
  data_consent boolean not null check (data_consent = true),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  admin_note text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donations_reference_code_format check (reference_code ~ '^DON-[0-9]{4}-[A-Za-z0-9]{6}$')
);

-- Trigger para updated_at
create trigger donations_set_updated_at
  before update on public.donations
  for each row execute function public.set_updated_at();

-- Índices requeridos
create index donations_status_created_at_idx
  on public.donations (status, created_at desc);

create index donations_created_at_idx
  on public.donations (created_at desc);

-- RLS habilitado
alter table public.donations enable row level security;

-- Políticas: SELECT y UPDATE solo para administradores
create policy "Admins can view donations"
  on public.donations
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update donations"
  on public.donations
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- SIN políticas de INSERT ni DELETE para anon ni authenticated:
-- las inserciones y mutaciones de servicio las realiza el servidor con service_role.

-- Permisos PostgREST
grant select, update on table public.donations to authenticated;
grant all on table public.donations to service_role;

-- 2. Función public.get_donation_summary()
-- SECURITY INVOKER: se apoya en RLS (usuarios normales o anon no ven filas y obtienen 0; admin obtiene los totales reales).
create or replace function public.get_donation_summary()
returns table (
  total_verificado bigint,
  cantidad_verificadas bigint,
  total_verificado_mes_actual bigint,
  cantidad_pendientes bigint,
  total_pendiente bigint,
  cantidad_rechazadas bigint
)
language sql
security invoker
set search_path = public
as $$
  select
    coalesce(sum(case when status = 'verified' then amount else 0 end), 0)::bigint as total_verificado,
    coalesce(count(case when status = 'verified' then 1 end), 0)::bigint as cantidad_verificadas,
    coalesce(sum(case when status = 'verified' and created_at >= (date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota') then amount else 0 end), 0)::bigint as total_verificado_mes_actual,
    coalesce(count(case when status = 'pending' then 1 end), 0)::bigint as cantidad_pendientes,
    coalesce(sum(case when status = 'pending' then amount else 0 end), 0)::bigint as total_pendiente,
    coalesce(count(case when status = 'rejected' then 1 end), 0)::bigint as cantidad_rechazadas
  from public.donations;
$$;

grant execute on function public.get_donation_summary() to authenticated;

-- 3. Storage: bucket privado donation-receipts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'donation-receipts',
  'donation-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Política Storage: solo administradores pueden leer objetos de este bucket
create policy "Admins can read donation receipts"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'donation-receipts' and public.is_admin());


