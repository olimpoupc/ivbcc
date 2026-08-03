-- Saving a quiz (create or edit) previously ran as a sequence of separate
-- inserts/updates/deletes from the client: if any step failed partway, it
-- could leave orphaned questions without options, or (on edit) a quiz wiped
-- of all its questions after the delete-and-reinsert step failed midway.
-- A single plpgsql function call is implicitly one transaction in Postgres,
-- so wrapping the whole save here makes it atomic: either everything commits
-- or nothing does.

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
begin
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

grant execute on function public.save_quiz(uuid, uuid, uuid, text, text, jsonb) to authenticated;
