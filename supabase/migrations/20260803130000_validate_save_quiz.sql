-- save_quiz() had no validation of its own: it trusted p_questions
-- completely and would happily save a quiz with zero questions, a question
-- with zero options, or a question where no option is marked is_correct —
-- silently producing a quiz nobody could ever pass. The only validation
-- lived in QuizEditorForm.tsx (client-side), which protects the app's own
-- UI but not a direct call to the RPC (console, script, or a future admin
-- feature that calls save_quiz differently). Validates the whole payload
-- upfront, before touching any existing data, so a bad call fails clean
-- instead of leaving a half-saved quiz.

create or replace function public.save_quiz(
  p_quiz_id uuid,
  p_course_id uuid,
  p_lesson_id uuid,
  p_title text,
  p_status text,
  p_questions jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_quiz_id uuid;
  v_question jsonb;
  v_option jsonb;
  v_question_id uuid;
  v_has_correct boolean;
begin
  if p_questions is null or jsonb_array_length(p_questions) = 0 then
    raise exception 'El quiz debe tener al menos una pregunta.';
  end if;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    if v_question -> 'options' is null or jsonb_array_length(v_question -> 'options') = 0 then
      raise exception 'Cada pregunta debe tener al menos una opción.';
    end if;

    v_has_correct := false;
    for v_option in select * from jsonb_array_elements(v_question -> 'options')
    loop
      if (v_option ->> 'is_correct')::boolean then
        v_has_correct := true;
      end if;
    end loop;

    if not v_has_correct then
      raise exception 'Cada pregunta debe tener al menos una opción marcada como correcta.';
    end if;
  end loop;

  if p_quiz_id is null then
    insert into public.quizzes (course_id, lesson_id, title, status)
    values (p_course_id, p_lesson_id, p_title, p_status)
    returning id into v_quiz_id;
  else
    update public.quizzes
    set lesson_id = p_lesson_id,
        title = p_title,
        status = p_status
    where id = p_quiz_id
      and course_id = p_course_id
    returning id into v_quiz_id;

    if v_quiz_id is null then
      raise exception 'Quiz no encontrado';
    end if;

    delete from public.quiz_questions where quiz_id = v_quiz_id;
  end if;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    insert into public.quiz_questions (quiz_id, question_text, "order")
    values (
      v_quiz_id,
      v_question ->> 'question_text',
      (v_question ->> 'order')::int
    )
    returning id into v_question_id;

    for v_option in select * from jsonb_array_elements(v_question -> 'options')
    loop
      insert into public.quiz_options (question_id, option_text, is_correct, "order")
      values (
        v_question_id,
        v_option ->> 'option_text',
        (v_option ->> 'is_correct')::boolean,
        (v_option ->> 'order')::int
      );
    end loop;
  end loop;

  return v_quiz_id;
end;
$$;
