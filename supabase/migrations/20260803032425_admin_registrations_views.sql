-- Admins were missing read-all policies on course_enrollments and profiles
-- (only "read own row" policies existed), so the admin inscripciones and
-- certificados pages could not see other users' enrollments or names.
-- These are additive permissive policies, consistent with the is_admin()
-- pattern already used on donation_methods, chatbot_items, live_streams,
-- publications and contact_messages.

create policy "Admins can read all course enrollments"
  on "public"."course_enrollments"
  as permissive
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can read all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
  using (public.is_admin());

-- Flattened, searchable views for the admin "Inscripciones" listing so
-- Next.js can paginate and search with .ilike()/.range() instead of doing
-- manual joins in application code.
--
-- security_invoker = true makes each view enforce RLS as the querying user
-- (not the view owner), so access stays governed by the policies above
-- rather than being silently bypassed by view ownership.

create or replace view public.admin_event_registrations_view
  with (security_invoker = true) as
select
  er.id,
  er.event_id,
  er.full_name,
  er.email,
  er.phone,
  er.created_at,
  e.title as event_title
from public.event_registrations er
join public.events e on e.id = er.event_id;

create or replace view public.admin_course_enrollments_view
  with (security_invoker = true) as
select
  ce.id,
  ce.course_id,
  ce.user_id,
  ce.created_at,
  c.title as course_title,
  coalesce(
    nullif(trim(concat(p.first_name, ' ', p.last_name)), ''),
    'Usuario sin nombre'
  ) as student_name
from public.course_enrollments ce
join public.courses c on c.id = ce.course_id
left join public.profiles p on p.id = ce.user_id;

grant select on public.admin_event_registrations_view to authenticated;
grant select on public.admin_course_enrollments_view to authenticated;
