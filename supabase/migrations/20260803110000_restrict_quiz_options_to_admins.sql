-- "Public can read options from published quizzes" was `to public using
-- (quiz is published)` with no column restriction — Postgres RLS controls
-- rows, not columns, so any visitor could call
-- supabase.from("quiz_options").select("is_correct")... directly against the
-- API and read every correct answer for every quiz, regardless of what the
-- app's own pages choose to render or request. Removing student rendering
-- from the app's select() list (done in the app in the same change) only
-- stops the passive leak via page source; it does nothing against a direct
-- API call unless the policy itself stops granting read access.
--
-- quiz_options is now admin-only to read (matching QuizEditorForm.tsx, which
-- already runs under the admin's own session). Grading a submitted attempt
-- and rendering the answer choices for a student to pick from both move to
-- a narrowly-scoped service-role read in the app (see
-- src/lib/supabase-server.ts createSupabaseServiceRoleClient and
-- formacion/[slug]/quizzes/[quizId]/{page.tsx,actions.ts}), since no
-- authenticated-user policy can correctly grant "read option_text but not
-- is_correct" — RLS can't do column-level filtering.

drop policy "Public can read options from published quizzes" on "public"."quiz_options";

create policy "Admins can read quiz options"
  on "public"."quiz_options" as permissive for select to authenticated
  using (public.is_admin());
