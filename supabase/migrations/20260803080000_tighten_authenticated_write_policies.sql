-- Several policies were written as "to authenticated using (true)" instead
-- of requiring public.is_admin() or row ownership. Since the admin UI's own
-- guard (getAdminUser()/isAdmin) only protects the Next.js app, any signed-up
-- member calling the Supabase REST/RPC API directly (bypassing the app
-- entirely) could create/edit/delete news, events, courses, lessons and
-- quizzes, read every visitor's event registrations, and — worst case —
-- read or overwrite any other student's quiz_attempts to self-approve a quiz
-- and fraudulently qualify for a certificate. This tightens every one of
-- those policies to public.is_admin() (content tables) or auth.uid() =
-- user_id (per-user data), without changing app behavior for real admins or
-- students: every legitimate read/write already goes through
-- createSupabaseServerClient() under an authenticated session, and student
-- pages already filter to their own user_id or to published content.

-- courses
drop policy "Authenticated users can create courses" on "public"."courses";
create policy "Admins can create courses"
  on "public"."courses" as permissive for insert to authenticated
  with check (public.is_admin());

drop policy "Authenticated users can update courses" on "public"."courses";
create policy "Admins can update courses"
  on "public"."courses" as permissive for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy "Authenticated users can delete courses" on "public"."courses";
create policy "Admins can delete courses"
  on "public"."courses" as permissive for delete to authenticated
  using (public.is_admin());

drop policy "Authenticated users can read all courses" on "public"."courses";
create policy "Admins can read all courses"
  on "public"."courses" as permissive for select to authenticated
  using (public.is_admin());

-- events
drop policy "Authenticated users can create events" on "public"."events";
create policy "Admins can create events"
  on "public"."events" as permissive for insert to authenticated
  with check (public.is_admin());

drop policy "Authenticated users can update events" on "public"."events";
create policy "Admins can update events"
  on "public"."events" as permissive for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy "Authenticated users can delete events" on "public"."events";
create policy "Admins can delete events"
  on "public"."events" as permissive for delete to authenticated
  using (public.is_admin());

drop policy "Authenticated users can read all events" on "public"."events";
create policy "Admins can read all events"
  on "public"."events" as permissive for select to authenticated
  using (public.is_admin());

-- lessons
drop policy "Authenticated users can create lessons" on "public"."lessons";
create policy "Admins can create lessons"
  on "public"."lessons" as permissive for insert to authenticated
  with check (public.is_admin());

drop policy "Authenticated users can update lessons" on "public"."lessons";
create policy "Admins can update lessons"
  on "public"."lessons" as permissive for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy "Authenticated users can delete lessons" on "public"."lessons";
create policy "Admins can delete lessons"
  on "public"."lessons" as permissive for delete to authenticated
  using (public.is_admin());

drop policy "Authenticated users can read all lessons" on "public"."lessons";
create policy "Admins can read all lessons"
  on "public"."lessons" as permissive for select to authenticated
  using (public.is_admin());

-- quizzes
drop policy "Authenticated users can create quizzes" on "public"."quizzes";
create policy "Admins can create quizzes"
  on "public"."quizzes" as permissive for insert to authenticated
  with check (public.is_admin());

drop policy "Authenticated users can update quizzes" on "public"."quizzes";
create policy "Admins can update quizzes"
  on "public"."quizzes" as permissive for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy "Authenticated users can delete quizzes" on "public"."quizzes";
create policy "Admins can delete quizzes"
  on "public"."quizzes" as permissive for delete to authenticated
  using (public.is_admin());

drop policy "Authenticated users can read all quizzes" on "public"."quizzes";
create policy "Admins can read all quizzes"
  on "public"."quizzes" as permissive for select to authenticated
  using (public.is_admin());

-- quiz_questions / quiz_options (managed together via save_quiz())
drop policy "Authenticated users can manage quiz questions" on "public"."quiz_questions";
create policy "Admins can manage quiz questions"
  on "public"."quiz_questions" as permissive for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy "Authenticated users can manage quiz options" on "public"."quiz_options";
create policy "Admins can manage quiz options"
  on "public"."quiz_options" as permissive for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- news
drop policy "Permitir crear noticias a usuarios autenticados" on "public"."news";
create policy "Admins can create news"
  on "public"."news" as permissive for insert to authenticated
  with check (public.is_admin());

drop policy "Permitir actualizar noticias a usuarios autenticados" on "public"."news";
create policy "Admins can update news"
  on "public"."news" as permissive for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy "Permitir eliminar noticias a usuarios autenticados" on "public"."news";
create policy "Admins can delete news"
  on "public"."news" as permissive for delete to authenticated
  using (public.is_admin());

-- event_registrations: visitor contact info (name/email/phone) was readable
-- by any signed-up member, not just admins.
drop policy "Authenticated users can read event registrations" on "public"."event_registrations";
create policy "Admins can read event registrations"
  on "public"."event_registrations" as permissive for select to authenticated
  using (public.is_admin());

-- quiz_attempts: the app only ever inserts a new row as the current user
-- and reads its own rows back (never updates a past attempt), so the blanket
-- update policy has no legitimate caller — it only let any user overwrite
-- any other user's score. Insert/select are scoped to the owning row;
-- certificados/page.tsx (admin) gets its own explicit read-all policy below.
drop policy "Authenticated users can create quiz attempts" on "public"."quiz_attempts";
create policy "Users can create own quiz attempts"
  on "public"."quiz_attempts" as permissive for insert to authenticated
  with check (auth.uid() = user_id);

drop policy "Authenticated users can read all quiz attempts" on "public"."quiz_attempts";
create policy "Users can read own quiz attempts"
  on "public"."quiz_attempts" as permissive for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins can read all quiz attempts"
  on "public"."quiz_attempts" as permissive for select to authenticated
  using (public.is_admin());

drop policy "Authenticated users can manage quiz attempts" on "public"."quiz_attempts";

-- course_progress: not read or written anywhere in the app codebase today,
-- but was fully open (any authenticated user could read/write/delete any
-- other user's rows). Scoped to ownership for whenever it is used.
drop policy "Authenticated users can create course progress" on "public"."course_progress";
create policy "Users can create own course progress"
  on "public"."course_progress" as permissive for insert to authenticated
  with check (auth.uid() = user_id);

drop policy "Authenticated users can read course progress" on "public"."course_progress";
create policy "Users can read own course progress"
  on "public"."course_progress" as permissive for select to authenticated
  using (auth.uid() = user_id);

drop policy "Authenticated users can update course progress" on "public"."course_progress";
create policy "Users can update own course progress"
  on "public"."course_progress" as permissive for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy "Authenticated users can delete course progress" on "public"."course_progress";
create policy "Users can delete own course progress"
  on "public"."course_progress" as permissive for delete to authenticated
  using (auth.uid() = user_id);
