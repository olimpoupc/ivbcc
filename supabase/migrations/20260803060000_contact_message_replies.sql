-- contact_messages.admin_response has always been a private follow-up note,
-- never an actual email sent to the person who wrote in (the admin UI even
-- says so explicitly). This adds a real reply history so admins can send a
-- real email to the sender (via Resend, from a Server Action) and keep a
-- record of every reply sent, separate from the private note.

create table public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  contact_message_id uuid not null references public.contact_messages(id) on delete cascade,
  sent_by uuid references auth.users(id) on delete set null,
  sent_by_email text,
  subject text not null,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index contact_message_replies_message_idx
  on public.contact_message_replies (contact_message_id, created_at desc);

alter table public.contact_message_replies enable row level security;

create policy "Admins can read contact message replies"
  on public.contact_message_replies
  as permissive
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can create contact message replies"
  on public.contact_message_replies
  as permissive
  for insert
  to authenticated
  with check (public.is_admin());

grant select, insert on table public.contact_message_replies to authenticated;
grant select, insert on table public.contact_message_replies to service_role;
