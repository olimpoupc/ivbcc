-- Stage B of closing the quiz_attempts / course_certificates write holes.
-- DO NOT APPLY until the code that writes with the service-role client (and
-- reads certificates through verify_certificate()) is deployed and a real
-- student flow has been confirmed working: after this migration the app's
-- previous session-based writes would be rejected.
--
-- 1) quiz_attempts: "Users can create own quiz attempts" only checked
--    auth.uid() = user_id, so anyone could call the Supabase API directly and
--    insert an attempt with a perfect (or any) score, skipping the server-side
--    grading in submitQuizAttempt. The action now inserts with service_role.
-- 2) course_certificates: "Users can create own certificates" had the same shape
--    and let anyone issue themselves a "valid" certificate for any course with
--    any name/title, without enrolling or passing anything. The action now
--    inserts with service_role after verifying eligibility.
-- 3) course_certificates: "Public can verify valid certificates" allowed listing
--    every valid certificate (student name, user_id, code) to anonymous
--    visitors. Verification goes through verify_certificate(code) now.
--
-- Kept on purpose: "Users can read own certificates" (own certificate pages),
-- the "read own attempts" policies, and the admin policies.

drop policy "Users can create own quiz attempts" on public.quiz_attempts;

drop policy "Users can create own certificates" on public.course_certificates;

drop policy "Public can verify valid certificates" on public.course_certificates;
