-- Stage A of closing the quiz_attempts / course_certificates write holes.
-- Purely additive: it changes no existing behavior, so it is safe to apply
-- BEFORE the code that depends on it is deployed. The policy removals live in
-- the next migration and must only be applied after that code is live.
--
-- 1) verify_certificate(code): exact-code public verification.
--    "Public can verify valid certificates" was `to anon, authenticated using
--    (status = 'valid')` with no restriction on which rows, so any visitor could
--    `select * from course_certificates` and list every student's name, user_id
--    and certificate code without knowing a single code. The verification page
--    only ever needs ONE certificate by its exact code, so it now calls this
--    function instead (the policy itself is dropped in the next migration).
--    SECURITY DEFINER + a fixed column list: the caller gets the public fields
--    of a single row, never user_id/course_id and never the table. Revoked
--    certificates are returned too (with their status) so the page can keep
--    saying "revoked" instead of "not found".
--
-- 2) quiz_attempts score range: nothing stopped score = 999 with
--    total_questions = 1. The application always writes 0 <= score <= total.

create or replace function public.verify_certificate(p_code text)
returns table (
  code text,
  student_name text,
  course_title text,
  issued_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.code, c.student_name, c.course_title, c.issued_at, c.status
  from public.course_certificates c
  where c.code = upper(btrim(p_code))
  limit 1;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

alter table public.quiz_attempts
  add constraint quiz_attempts_score_range_check
  check (score >= 0 and score <= total_questions);
