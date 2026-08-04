-- Now that grading is server-side and authoritative (see the previous
-- migration + submitQuizAttempt), the only way left to "pass" a quiz
-- without knowing the material is brute-force guessing across unlimited
-- attempts — nothing throttled how often a user could insert into
-- quiz_attempts. Reuses the same check_rate_limit() infrastructure already
-- used for contact_messages/event_registrations: 5 attempts per 10 minutes
-- per user+quiz, generous for a real student retrying, but enough to make
-- automated random-guessing impractical.

create or replace function public.enforce_quiz_attempt_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_rate_limit(
    'quiz_attempt:' || new.user_id::text || ':' || new.quiz_id::text,
    5,
    600
  ) then
    raise exception 'Demasiados intentos en este quiz. Espera unos minutos e intenta de nuevo.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger quiz_attempts_rate_limit
  before insert on public.quiz_attempts
  for each row execute function public.enforce_quiz_attempt_rate_limit();
