drop extension if exists "pg_net";


  create table "public"."chatbot_items" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "message" text not null,
    "category" text not null default 'general'::text,
    "button_text" text,
    "button_url" text,
    "order_index" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."chatbot_items" enable row level security;


  create table "public"."contact_messages" (
    "id" uuid not null default gen_random_uuid(),
    "full_name" text not null,
    "email" text not null,
    "phone" text,
    "church_name" text,
    "subject" text not null,
    "category" text not null default 'general'::text,
    "message" text not null,
    "status" text not null default 'pending'::text,
    "admin_response" text,
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."contact_messages" enable row level security;


  create table "public"."course_certificates" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "user_id" uuid not null,
    "course_id" uuid not null,
    "student_name" text not null,
    "course_title" text not null,
    "issued_at" timestamp with time zone not null default now(),
    "status" text not null default 'valid'::text,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."course_certificates" enable row level security;


  create table "public"."course_enrollments" (
    "id" uuid not null default gen_random_uuid(),
    "course_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."course_enrollments" enable row level security;


  create table "public"."course_progress" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "course_id" uuid not null,
    "lesson_id" uuid not null,
    "completed" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."course_progress" enable row level security;


  create table "public"."courses" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "description" text not null,
    "image_url" text,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."courses" enable row level security;


  create table "public"."donation_methods" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "method_type" text not null,
    "description" text,
    "account_holder" text,
    "account_number" text,
    "bank_name" text,
    "document_number" text,
    "phone" text,
    "qr_image_url" text,
    "payment_url" text,
    "instructions" text,
    "order_index" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."donation_methods" enable row level security;


  create table "public"."event_registrations" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid not null,
    "full_name" text not null,
    "email" text not null,
    "phone" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."event_registrations" enable row level security;


  create table "public"."events" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "description" text not null,
    "image_url" text,
    "event_date" timestamp with time zone not null,
    "location" text,
    "status" text not null default 'draft'::text,
    "registration_enabled" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."events" enable row level security;


  create table "public"."lessons" (
    "id" uuid not null default gen_random_uuid(),
    "course_id" uuid not null,
    "title" text not null,
    "content" text not null,
    "order" integer not null default 1,
    "created_at" timestamp with time zone not null default now(),
    "video_url" text,
    "material_url" text
      );


alter table "public"."lessons" enable row level security;


  create table "public"."live_streams" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "description" text,
    "youtube_url" text not null,
    "thumbnail_url" text,
    "category" text not null,
    "is_live" boolean not null default false,
    "featured" boolean not null default false,
    "status" text not null default 'draft'::text,
    "scheduled_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "ends_at" timestamp with time zone
      );


alter table "public"."live_streams" enable row level security;


  create table "public"."news" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "summary" text not null,
    "content" text not null,
    "image_url" text,
    "is_published" boolean default true,
    "created_at" timestamp with time zone default now(),
    "status" text default 'published'::text,
    "published_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone
      );


alter table "public"."news" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "role" text not null default 'user'::text,
    "first_name" text,
    "last_name" text,
    "age" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."publications" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "summary" text,
    "content" text,
    "category" text not null,
    "image_url" text,
    "file_url" text,
    "video_url" text,
    "status" text not null default 'draft'::text,
    "featured" boolean not null default false,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."publications" enable row level security;


  create table "public"."quiz_attempts" (
    "id" uuid not null default gen_random_uuid(),
    "quiz_id" uuid not null,
    "user_id" uuid not null,
    "score" integer not null default 0,
    "total_questions" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."quiz_attempts" enable row level security;


  create table "public"."quiz_options" (
    "id" uuid not null default gen_random_uuid(),
    "question_id" uuid not null,
    "option_text" text not null,
    "is_correct" boolean not null default false,
    "order" integer not null default 1,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."quiz_options" enable row level security;


  create table "public"."quiz_questions" (
    "id" uuid not null default gen_random_uuid(),
    "quiz_id" uuid not null,
    "question_text" text not null,
    "order" integer not null default 1,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."quiz_questions" enable row level security;


  create table "public"."quizzes" (
    "id" uuid not null default gen_random_uuid(),
    "course_id" uuid not null,
    "lesson_id" uuid,
    "title" text not null,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."quizzes" enable row level security;


  create table "public"."site_settings" (
    "id" uuid not null default gen_random_uuid(),
    "singleton_key" boolean not null default true,
    "church_name" text not null default 'Iglesia Valle de Bendición Cruzada Cristiana'::text,
    "slogan" text,
    "phone" text,
    "whatsapp" text,
    "primary_email" text,
    "address" text,
    "google_maps_url" text,
    "facebook_url" text,
    "instagram_url" text,
    "youtube_url" text,
    "logo_url" text,
    "hero_title" text,
    "hero_subtitle" text,
    "schedules" text,
    "footer_text" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."site_settings" enable row level security;

CREATE INDEX chatbot_items_active_order_idx ON public.chatbot_items USING btree (is_active, order_index);

CREATE INDEX chatbot_items_category_idx ON public.chatbot_items USING btree (category);

CREATE INDEX chatbot_items_is_active_idx ON public.chatbot_items USING btree (is_active);

CREATE INDEX chatbot_items_order_index_idx ON public.chatbot_items USING btree (order_index);

CREATE UNIQUE INDEX chatbot_items_pkey ON public.chatbot_items USING btree (id);

CREATE INDEX contact_messages_category_idx ON public.contact_messages USING btree (category);

CREATE INDEX contact_messages_created_at_idx ON public.contact_messages USING btree (created_at DESC);

CREATE INDEX contact_messages_email_idx ON public.contact_messages USING btree (email);

CREATE UNIQUE INDEX contact_messages_pkey ON public.contact_messages USING btree (id);

CREATE INDEX contact_messages_responded_at_idx ON public.contact_messages USING btree (responded_at DESC);

CREATE INDEX contact_messages_status_idx ON public.contact_messages USING btree (status);

CREATE INDEX course_certificates_code_idx ON public.course_certificates USING btree (code);

CREATE UNIQUE INDEX course_certificates_code_key ON public.course_certificates USING btree (code);

CREATE INDEX course_certificates_course_id_idx ON public.course_certificates USING btree (course_id);

CREATE UNIQUE INDEX course_certificates_pkey ON public.course_certificates USING btree (id);

CREATE INDEX course_certificates_status_idx ON public.course_certificates USING btree (status);

CREATE UNIQUE INDEX course_certificates_user_id_course_id_key ON public.course_certificates USING btree (user_id, course_id);

CREATE INDEX course_certificates_user_id_idx ON public.course_certificates USING btree (user_id);

CREATE INDEX course_enrollments_course_id_idx ON public.course_enrollments USING btree (course_id);

CREATE UNIQUE INDEX course_enrollments_course_user_unique_idx ON public.course_enrollments USING btree (course_id, user_id);

CREATE UNIQUE INDEX course_enrollments_pkey ON public.course_enrollments USING btree (id);

CREATE INDEX course_enrollments_user_id_idx ON public.course_enrollments USING btree (user_id);

CREATE INDEX course_progress_course_id_idx ON public.course_progress USING btree (course_id);

CREATE INDEX course_progress_lesson_id_idx ON public.course_progress USING btree (lesson_id);

CREATE UNIQUE INDEX course_progress_pkey ON public.course_progress USING btree (id);

CREATE INDEX course_progress_user_id_idx ON public.course_progress USING btree (user_id);

CREATE UNIQUE INDEX course_progress_user_lesson_unique_idx ON public.course_progress USING btree (user_id, lesson_id);

CREATE UNIQUE INDEX courses_pkey ON public.courses USING btree (id);

CREATE INDEX courses_slug_idx ON public.courses USING btree (slug);

CREATE UNIQUE INDEX courses_slug_key ON public.courses USING btree (slug);

CREATE INDEX courses_status_idx ON public.courses USING btree (status);

CREATE INDEX donation_methods_active_order_idx ON public.donation_methods USING btree (is_active, order_index);

CREATE INDEX donation_methods_is_active_idx ON public.donation_methods USING btree (is_active);

CREATE INDEX donation_methods_method_type_idx ON public.donation_methods USING btree (method_type);

CREATE INDEX donation_methods_order_index_idx ON public.donation_methods USING btree (order_index);

CREATE UNIQUE INDEX donation_methods_pkey ON public.donation_methods USING btree (id);

CREATE INDEX event_registrations_email_idx ON public.event_registrations USING btree (email);

CREATE UNIQUE INDEX event_registrations_event_id_email_key ON public.event_registrations USING btree (event_id, email);

CREATE INDEX event_registrations_event_id_idx ON public.event_registrations USING btree (event_id);

CREATE UNIQUE INDEX event_registrations_pkey ON public.event_registrations USING btree (id);

CREATE INDEX events_event_date_idx ON public.events USING btree (event_date);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE INDEX events_slug_idx ON public.events USING btree (slug);

CREATE UNIQUE INDEX events_slug_key ON public.events USING btree (slug);

CREATE INDEX events_status_idx ON public.events USING btree (status);

CREATE INDEX lessons_course_id_idx ON public.lessons USING btree (course_id);

CREATE UNIQUE INDEX lessons_course_id_order_key ON public.lessons USING btree (course_id, "order");

CREATE INDEX lessons_course_order_idx ON public.lessons USING btree (course_id, "order");

CREATE UNIQUE INDEX lessons_pkey ON public.lessons USING btree (id);

CREATE INDEX live_streams_category_idx ON public.live_streams USING btree (category);

CREATE INDEX live_streams_created_at_idx ON public.live_streams USING btree (created_at DESC);

CREATE INDEX live_streams_ends_at_idx ON public.live_streams USING btree (ends_at DESC);

CREATE INDEX live_streams_featured_idx ON public.live_streams USING btree (featured);

CREATE INDEX live_streams_is_live_idx ON public.live_streams USING btree (is_live);

CREATE UNIQUE INDEX live_streams_pkey ON public.live_streams USING btree (id);

CREATE INDEX live_streams_scheduled_at_idx ON public.live_streams USING btree (scheduled_at DESC);

CREATE INDEX live_streams_slug_idx ON public.live_streams USING btree (slug);

CREATE UNIQUE INDEX live_streams_slug_key ON public.live_streams USING btree (slug);

CREATE INDEX live_streams_status_idx ON public.live_streams USING btree (status);

CREATE UNIQUE INDEX news_pkey ON public.news USING btree (id);

CREATE UNIQUE INDEX news_slug_key ON public.news USING btree (slug);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);

CREATE INDEX publications_category_idx ON public.publications USING btree (category);

CREATE INDEX publications_featured_idx ON public.publications USING btree (featured);

CREATE UNIQUE INDEX publications_pkey ON public.publications USING btree (id);

CREATE INDEX publications_published_at_idx ON public.publications USING btree (published_at DESC);

CREATE INDEX publications_slug_idx ON public.publications USING btree (slug);

CREATE UNIQUE INDEX publications_slug_key ON public.publications USING btree (slug);

CREATE INDEX publications_status_idx ON public.publications USING btree (status);

CREATE UNIQUE INDEX quiz_attempts_pkey ON public.quiz_attempts USING btree (id);

CREATE INDEX quiz_attempts_quiz_id_idx ON public.quiz_attempts USING btree (quiz_id);

CREATE INDEX quiz_attempts_quiz_user_idx ON public.quiz_attempts USING btree (quiz_id, user_id);

CREATE INDEX quiz_attempts_user_id_idx ON public.quiz_attempts USING btree (user_id);

CREATE UNIQUE INDEX quiz_options_pkey ON public.quiz_options USING btree (id);

CREATE INDEX quiz_options_question_id_idx ON public.quiz_options USING btree (question_id);

CREATE INDEX quiz_options_question_order_idx ON public.quiz_options USING btree (question_id, "order");

CREATE UNIQUE INDEX quiz_questions_pkey ON public.quiz_questions USING btree (id);

CREATE INDEX quiz_questions_quiz_id_idx ON public.quiz_questions USING btree (quiz_id);

CREATE INDEX quiz_questions_quiz_order_idx ON public.quiz_questions USING btree (quiz_id, "order");

CREATE INDEX quizzes_course_id_idx ON public.quizzes USING btree (course_id);

CREATE INDEX quizzes_lesson_id_idx ON public.quizzes USING btree (lesson_id);

CREATE UNIQUE INDEX quizzes_pkey ON public.quizzes USING btree (id);

CREATE INDEX quizzes_status_idx ON public.quizzes USING btree (status);

CREATE UNIQUE INDEX site_settings_pkey ON public.site_settings USING btree (id);

CREATE UNIQUE INDEX site_settings_singleton_key_key ON public.site_settings USING btree (singleton_key);

alter table "public"."chatbot_items" add constraint "chatbot_items_pkey" PRIMARY KEY using index "chatbot_items_pkey";

alter table "public"."contact_messages" add constraint "contact_messages_pkey" PRIMARY KEY using index "contact_messages_pkey";

alter table "public"."course_certificates" add constraint "course_certificates_pkey" PRIMARY KEY using index "course_certificates_pkey";

alter table "public"."course_enrollments" add constraint "course_enrollments_pkey" PRIMARY KEY using index "course_enrollments_pkey";

alter table "public"."course_progress" add constraint "course_progress_pkey" PRIMARY KEY using index "course_progress_pkey";

alter table "public"."courses" add constraint "courses_pkey" PRIMARY KEY using index "courses_pkey";

alter table "public"."donation_methods" add constraint "donation_methods_pkey" PRIMARY KEY using index "donation_methods_pkey";

alter table "public"."event_registrations" add constraint "event_registrations_pkey" PRIMARY KEY using index "event_registrations_pkey";

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."lessons" add constraint "lessons_pkey" PRIMARY KEY using index "lessons_pkey";

alter table "public"."live_streams" add constraint "live_streams_pkey" PRIMARY KEY using index "live_streams_pkey";

alter table "public"."news" add constraint "news_pkey" PRIMARY KEY using index "news_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."publications" add constraint "publications_pkey" PRIMARY KEY using index "publications_pkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_pkey" PRIMARY KEY using index "quiz_attempts_pkey";

alter table "public"."quiz_options" add constraint "quiz_options_pkey" PRIMARY KEY using index "quiz_options_pkey";

alter table "public"."quiz_questions" add constraint "quiz_questions_pkey" PRIMARY KEY using index "quiz_questions_pkey";

alter table "public"."quizzes" add constraint "quizzes_pkey" PRIMARY KEY using index "quizzes_pkey";

alter table "public"."site_settings" add constraint "site_settings_pkey" PRIMARY KEY using index "site_settings_pkey";

alter table "public"."chatbot_items" add constraint "chatbot_items_category_check" CHECK ((category = ANY (ARRAY['general'::text, 'schedules'::text, 'events'::text, 'formation'::text, 'live'::text, 'location'::text, 'contact'::text, 'prayer'::text, 'whatsapp'::text]))) not valid;

alter table "public"."chatbot_items" validate constraint "chatbot_items_category_check";

alter table "public"."contact_messages" add constraint "contact_messages_category_check" CHECK ((category = ANY (ARRAY['general'::text, 'counseling'::text, 'formation'::text, 'events'::text, 'prayer'::text, 'support'::text, 'other'::text]))) not valid;

alter table "public"."contact_messages" validate constraint "contact_messages_category_check";

alter table "public"."contact_messages" add constraint "contact_messages_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'read'::text, 'responded'::text, 'archived'::text]))) not valid;

alter table "public"."contact_messages" validate constraint "contact_messages_status_check";

alter table "public"."course_certificates" add constraint "course_certificates_code_key" UNIQUE using index "course_certificates_code_key";

alter table "public"."course_certificates" add constraint "course_certificates_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."course_certificates" validate constraint "course_certificates_course_id_fkey";

alter table "public"."course_certificates" add constraint "course_certificates_status_check" CHECK ((status = ANY (ARRAY['valid'::text, 'revoked'::text]))) not valid;

alter table "public"."course_certificates" validate constraint "course_certificates_status_check";

alter table "public"."course_certificates" add constraint "course_certificates_user_id_course_id_key" UNIQUE using index "course_certificates_user_id_course_id_key";

alter table "public"."course_certificates" add constraint "course_certificates_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."course_certificates" validate constraint "course_certificates_user_id_fkey";

alter table "public"."course_enrollments" add constraint "course_enrollments_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."course_enrollments" validate constraint "course_enrollments_course_id_fkey";

alter table "public"."course_progress" add constraint "course_progress_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."course_progress" validate constraint "course_progress_course_id_fkey";

alter table "public"."course_progress" add constraint "course_progress_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE not valid;

alter table "public"."course_progress" validate constraint "course_progress_lesson_id_fkey";

alter table "public"."courses" add constraint "courses_slug_key" UNIQUE using index "courses_slug_key";

alter table "public"."courses" add constraint "courses_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text]))) not valid;

alter table "public"."courses" validate constraint "courses_status_check";

alter table "public"."donation_methods" add constraint "donation_methods_method_type_check" CHECK ((method_type = ANY (ARRAY['nequi'::text, 'bancolombia'::text, 'daviplata'::text, 'bank_account'::text, 'davivienda'::text, 'breb_key'::text, 'paypal'::text, 'wompi'::text, 'mercadopago'::text, 'other'::text]))) not valid;

alter table "public"."donation_methods" validate constraint "donation_methods_method_type_check";

alter table "public"."event_registrations" add constraint "event_registrations_email_check" CHECK ((email <> ''::text)) not valid;

alter table "public"."event_registrations" validate constraint "event_registrations_email_check";

alter table "public"."event_registrations" add constraint "event_registrations_event_id_email_key" UNIQUE using index "event_registrations_event_id_email_key";

alter table "public"."event_registrations" add constraint "event_registrations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_registrations" validate constraint "event_registrations_event_id_fkey";

alter table "public"."events" add constraint "events_slug_key" UNIQUE using index "events_slug_key";

alter table "public"."events" add constraint "events_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'scheduled'::text, 'cancelled'::text]))) not valid;

alter table "public"."events" validate constraint "events_status_check";

alter table "public"."lessons" add constraint "lessons_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."lessons" validate constraint "lessons_course_id_fkey";

alter table "public"."lessons" add constraint "lessons_course_id_order_key" UNIQUE using index "lessons_course_id_order_key";

alter table "public"."live_streams" add constraint "live_streams_category_check" CHECK ((category = ANY (ARRAY['live'::text, 'sunday'::text, 'preaching'::text, 'teaching'::text, 'special'::text]))) not valid;

alter table "public"."live_streams" validate constraint "live_streams_category_check";

alter table "public"."live_streams" add constraint "live_streams_slug_key" UNIQUE using index "live_streams_slug_key";

alter table "public"."live_streams" add constraint "live_streams_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text]))) not valid;

alter table "public"."live_streams" validate constraint "live_streams_status_check";

alter table "public"."news" add constraint "news_slug_key" UNIQUE using index "news_slug_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."publications" add constraint "publications_category_check" CHECK ((category = ANY (ARRAY['devotional'::text, 'reflection'::text, 'announcement'::text, 'bulletin'::text, 'document'::text, 'resource'::text, 'video'::text]))) not valid;

alter table "public"."publications" validate constraint "publications_category_check";

alter table "public"."publications" add constraint "publications_slug_key" UNIQUE using index "publications_slug_key";

alter table "public"."publications" add constraint "publications_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text]))) not valid;

alter table "public"."publications" validate constraint "publications_status_check";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempts" validate constraint "quiz_attempts_quiz_id_fkey";

alter table "public"."quiz_options" add constraint "quiz_options_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_options" validate constraint "quiz_options_question_id_fkey";

alter table "public"."quiz_questions" add constraint "quiz_questions_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_questions" validate constraint "quiz_questions_quiz_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."quizzes" validate constraint "quizzes_course_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE not valid;

alter table "public"."quizzes" validate constraint "quizzes_lesson_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text]))) not valid;

alter table "public"."quizzes" validate constraint "quizzes_status_check";

alter table "public"."site_settings" add constraint "site_settings_singleton_key_check" CHECK ((singleton_key = true)) not valid;

alter table "public"."site_settings" validate constraint "site_settings_singleton_key_check";

alter table "public"."site_settings" add constraint "site_settings_singleton_key_key" UNIQUE using index "site_settings_singleton_key_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.set_donation_methods_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."chatbot_items" to "anon";

grant insert on table "public"."chatbot_items" to "anon";

grant references on table "public"."chatbot_items" to "anon";

grant select on table "public"."chatbot_items" to "anon";

grant trigger on table "public"."chatbot_items" to "anon";

grant truncate on table "public"."chatbot_items" to "anon";

grant update on table "public"."chatbot_items" to "anon";

grant delete on table "public"."chatbot_items" to "authenticated";

grant insert on table "public"."chatbot_items" to "authenticated";

grant references on table "public"."chatbot_items" to "authenticated";

grant select on table "public"."chatbot_items" to "authenticated";

grant trigger on table "public"."chatbot_items" to "authenticated";

grant truncate on table "public"."chatbot_items" to "authenticated";

grant update on table "public"."chatbot_items" to "authenticated";

grant delete on table "public"."chatbot_items" to "service_role";

grant insert on table "public"."chatbot_items" to "service_role";

grant references on table "public"."chatbot_items" to "service_role";

grant select on table "public"."chatbot_items" to "service_role";

grant trigger on table "public"."chatbot_items" to "service_role";

grant truncate on table "public"."chatbot_items" to "service_role";

grant update on table "public"."chatbot_items" to "service_role";

grant delete on table "public"."contact_messages" to "anon";

grant insert on table "public"."contact_messages" to "anon";

grant references on table "public"."contact_messages" to "anon";

grant select on table "public"."contact_messages" to "anon";

grant trigger on table "public"."contact_messages" to "anon";

grant truncate on table "public"."contact_messages" to "anon";

grant update on table "public"."contact_messages" to "anon";

grant delete on table "public"."contact_messages" to "authenticated";

grant insert on table "public"."contact_messages" to "authenticated";

grant references on table "public"."contact_messages" to "authenticated";

grant select on table "public"."contact_messages" to "authenticated";

grant trigger on table "public"."contact_messages" to "authenticated";

grant truncate on table "public"."contact_messages" to "authenticated";

grant update on table "public"."contact_messages" to "authenticated";

grant delete on table "public"."contact_messages" to "service_role";

grant insert on table "public"."contact_messages" to "service_role";

grant references on table "public"."contact_messages" to "service_role";

grant select on table "public"."contact_messages" to "service_role";

grant trigger on table "public"."contact_messages" to "service_role";

grant truncate on table "public"."contact_messages" to "service_role";

grant update on table "public"."contact_messages" to "service_role";

grant delete on table "public"."course_certificates" to "anon";

grant insert on table "public"."course_certificates" to "anon";

grant references on table "public"."course_certificates" to "anon";

grant select on table "public"."course_certificates" to "anon";

grant trigger on table "public"."course_certificates" to "anon";

grant truncate on table "public"."course_certificates" to "anon";

grant update on table "public"."course_certificates" to "anon";

grant delete on table "public"."course_certificates" to "authenticated";

grant insert on table "public"."course_certificates" to "authenticated";

grant references on table "public"."course_certificates" to "authenticated";

grant select on table "public"."course_certificates" to "authenticated";

grant trigger on table "public"."course_certificates" to "authenticated";

grant truncate on table "public"."course_certificates" to "authenticated";

grant update on table "public"."course_certificates" to "authenticated";

grant delete on table "public"."course_certificates" to "service_role";

grant insert on table "public"."course_certificates" to "service_role";

grant references on table "public"."course_certificates" to "service_role";

grant select on table "public"."course_certificates" to "service_role";

grant trigger on table "public"."course_certificates" to "service_role";

grant truncate on table "public"."course_certificates" to "service_role";

grant update on table "public"."course_certificates" to "service_role";

grant delete on table "public"."course_enrollments" to "anon";

grant insert on table "public"."course_enrollments" to "anon";

grant references on table "public"."course_enrollments" to "anon";

grant select on table "public"."course_enrollments" to "anon";

grant trigger on table "public"."course_enrollments" to "anon";

grant truncate on table "public"."course_enrollments" to "anon";

grant update on table "public"."course_enrollments" to "anon";

grant delete on table "public"."course_enrollments" to "authenticated";

grant insert on table "public"."course_enrollments" to "authenticated";

grant references on table "public"."course_enrollments" to "authenticated";

grant select on table "public"."course_enrollments" to "authenticated";

grant trigger on table "public"."course_enrollments" to "authenticated";

grant truncate on table "public"."course_enrollments" to "authenticated";

grant update on table "public"."course_enrollments" to "authenticated";

grant delete on table "public"."course_enrollments" to "service_role";

grant insert on table "public"."course_enrollments" to "service_role";

grant references on table "public"."course_enrollments" to "service_role";

grant select on table "public"."course_enrollments" to "service_role";

grant trigger on table "public"."course_enrollments" to "service_role";

grant truncate on table "public"."course_enrollments" to "service_role";

grant update on table "public"."course_enrollments" to "service_role";

grant delete on table "public"."course_progress" to "anon";

grant insert on table "public"."course_progress" to "anon";

grant references on table "public"."course_progress" to "anon";

grant select on table "public"."course_progress" to "anon";

grant trigger on table "public"."course_progress" to "anon";

grant truncate on table "public"."course_progress" to "anon";

grant update on table "public"."course_progress" to "anon";

grant delete on table "public"."course_progress" to "authenticated";

grant insert on table "public"."course_progress" to "authenticated";

grant references on table "public"."course_progress" to "authenticated";

grant select on table "public"."course_progress" to "authenticated";

grant trigger on table "public"."course_progress" to "authenticated";

grant truncate on table "public"."course_progress" to "authenticated";

grant update on table "public"."course_progress" to "authenticated";

grant delete on table "public"."course_progress" to "service_role";

grant insert on table "public"."course_progress" to "service_role";

grant references on table "public"."course_progress" to "service_role";

grant select on table "public"."course_progress" to "service_role";

grant trigger on table "public"."course_progress" to "service_role";

grant truncate on table "public"."course_progress" to "service_role";

grant update on table "public"."course_progress" to "service_role";

grant delete on table "public"."courses" to "anon";

grant insert on table "public"."courses" to "anon";

grant references on table "public"."courses" to "anon";

grant select on table "public"."courses" to "anon";

grant trigger on table "public"."courses" to "anon";

grant truncate on table "public"."courses" to "anon";

grant update on table "public"."courses" to "anon";

grant delete on table "public"."courses" to "authenticated";

grant insert on table "public"."courses" to "authenticated";

grant references on table "public"."courses" to "authenticated";

grant select on table "public"."courses" to "authenticated";

grant trigger on table "public"."courses" to "authenticated";

grant truncate on table "public"."courses" to "authenticated";

grant update on table "public"."courses" to "authenticated";

grant delete on table "public"."courses" to "service_role";

grant insert on table "public"."courses" to "service_role";

grant references on table "public"."courses" to "service_role";

grant select on table "public"."courses" to "service_role";

grant trigger on table "public"."courses" to "service_role";

grant truncate on table "public"."courses" to "service_role";

grant update on table "public"."courses" to "service_role";

grant delete on table "public"."donation_methods" to "anon";

grant insert on table "public"."donation_methods" to "anon";

grant references on table "public"."donation_methods" to "anon";

grant select on table "public"."donation_methods" to "anon";

grant trigger on table "public"."donation_methods" to "anon";

grant truncate on table "public"."donation_methods" to "anon";

grant update on table "public"."donation_methods" to "anon";

grant delete on table "public"."donation_methods" to "authenticated";

grant insert on table "public"."donation_methods" to "authenticated";

grant references on table "public"."donation_methods" to "authenticated";

grant select on table "public"."donation_methods" to "authenticated";

grant trigger on table "public"."donation_methods" to "authenticated";

grant truncate on table "public"."donation_methods" to "authenticated";

grant update on table "public"."donation_methods" to "authenticated";

grant delete on table "public"."donation_methods" to "service_role";

grant insert on table "public"."donation_methods" to "service_role";

grant references on table "public"."donation_methods" to "service_role";

grant select on table "public"."donation_methods" to "service_role";

grant trigger on table "public"."donation_methods" to "service_role";

grant truncate on table "public"."donation_methods" to "service_role";

grant update on table "public"."donation_methods" to "service_role";

grant delete on table "public"."event_registrations" to "anon";

grant insert on table "public"."event_registrations" to "anon";

grant references on table "public"."event_registrations" to "anon";

grant select on table "public"."event_registrations" to "anon";

grant trigger on table "public"."event_registrations" to "anon";

grant truncate on table "public"."event_registrations" to "anon";

grant update on table "public"."event_registrations" to "anon";

grant delete on table "public"."event_registrations" to "authenticated";

grant insert on table "public"."event_registrations" to "authenticated";

grant references on table "public"."event_registrations" to "authenticated";

grant select on table "public"."event_registrations" to "authenticated";

grant trigger on table "public"."event_registrations" to "authenticated";

grant truncate on table "public"."event_registrations" to "authenticated";

grant update on table "public"."event_registrations" to "authenticated";

grant delete on table "public"."event_registrations" to "service_role";

grant insert on table "public"."event_registrations" to "service_role";

grant references on table "public"."event_registrations" to "service_role";

grant select on table "public"."event_registrations" to "service_role";

grant trigger on table "public"."event_registrations" to "service_role";

grant truncate on table "public"."event_registrations" to "service_role";

grant update on table "public"."event_registrations" to "service_role";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."lessons" to "anon";

grant insert on table "public"."lessons" to "anon";

grant references on table "public"."lessons" to "anon";

grant select on table "public"."lessons" to "anon";

grant trigger on table "public"."lessons" to "anon";

grant truncate on table "public"."lessons" to "anon";

grant update on table "public"."lessons" to "anon";

grant delete on table "public"."lessons" to "authenticated";

grant insert on table "public"."lessons" to "authenticated";

grant references on table "public"."lessons" to "authenticated";

grant select on table "public"."lessons" to "authenticated";

grant trigger on table "public"."lessons" to "authenticated";

grant truncate on table "public"."lessons" to "authenticated";

grant update on table "public"."lessons" to "authenticated";

grant delete on table "public"."lessons" to "service_role";

grant insert on table "public"."lessons" to "service_role";

grant references on table "public"."lessons" to "service_role";

grant select on table "public"."lessons" to "service_role";

grant trigger on table "public"."lessons" to "service_role";

grant truncate on table "public"."lessons" to "service_role";

grant update on table "public"."lessons" to "service_role";

grant delete on table "public"."live_streams" to "anon";

grant insert on table "public"."live_streams" to "anon";

grant references on table "public"."live_streams" to "anon";

grant select on table "public"."live_streams" to "anon";

grant trigger on table "public"."live_streams" to "anon";

grant truncate on table "public"."live_streams" to "anon";

grant update on table "public"."live_streams" to "anon";

grant delete on table "public"."live_streams" to "authenticated";

grant insert on table "public"."live_streams" to "authenticated";

grant references on table "public"."live_streams" to "authenticated";

grant select on table "public"."live_streams" to "authenticated";

grant trigger on table "public"."live_streams" to "authenticated";

grant truncate on table "public"."live_streams" to "authenticated";

grant update on table "public"."live_streams" to "authenticated";

grant delete on table "public"."live_streams" to "service_role";

grant insert on table "public"."live_streams" to "service_role";

grant references on table "public"."live_streams" to "service_role";

grant select on table "public"."live_streams" to "service_role";

grant trigger on table "public"."live_streams" to "service_role";

grant truncate on table "public"."live_streams" to "service_role";

grant update on table "public"."live_streams" to "service_role";

grant delete on table "public"."news" to "anon";

grant insert on table "public"."news" to "anon";

grant references on table "public"."news" to "anon";

grant select on table "public"."news" to "anon";

grant trigger on table "public"."news" to "anon";

grant truncate on table "public"."news" to "anon";

grant update on table "public"."news" to "anon";

grant delete on table "public"."news" to "authenticated";

grant insert on table "public"."news" to "authenticated";

grant references on table "public"."news" to "authenticated";

grant select on table "public"."news" to "authenticated";

grant trigger on table "public"."news" to "authenticated";

grant truncate on table "public"."news" to "authenticated";

grant update on table "public"."news" to "authenticated";

grant delete on table "public"."news" to "service_role";

grant insert on table "public"."news" to "service_role";

grant references on table "public"."news" to "service_role";

grant select on table "public"."news" to "service_role";

grant trigger on table "public"."news" to "service_role";

grant truncate on table "public"."news" to "service_role";

grant update on table "public"."news" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."publications" to "anon";

grant insert on table "public"."publications" to "anon";

grant references on table "public"."publications" to "anon";

grant select on table "public"."publications" to "anon";

grant trigger on table "public"."publications" to "anon";

grant truncate on table "public"."publications" to "anon";

grant update on table "public"."publications" to "anon";

grant delete on table "public"."publications" to "authenticated";

grant insert on table "public"."publications" to "authenticated";

grant references on table "public"."publications" to "authenticated";

grant select on table "public"."publications" to "authenticated";

grant trigger on table "public"."publications" to "authenticated";

grant truncate on table "public"."publications" to "authenticated";

grant update on table "public"."publications" to "authenticated";

grant delete on table "public"."publications" to "service_role";

grant insert on table "public"."publications" to "service_role";

grant references on table "public"."publications" to "service_role";

grant select on table "public"."publications" to "service_role";

grant trigger on table "public"."publications" to "service_role";

grant truncate on table "public"."publications" to "service_role";

grant update on table "public"."publications" to "service_role";

grant delete on table "public"."quiz_attempts" to "anon";

grant insert on table "public"."quiz_attempts" to "anon";

grant references on table "public"."quiz_attempts" to "anon";

grant select on table "public"."quiz_attempts" to "anon";

grant trigger on table "public"."quiz_attempts" to "anon";

grant truncate on table "public"."quiz_attempts" to "anon";

grant update on table "public"."quiz_attempts" to "anon";

grant delete on table "public"."quiz_attempts" to "authenticated";

grant insert on table "public"."quiz_attempts" to "authenticated";

grant references on table "public"."quiz_attempts" to "authenticated";

grant select on table "public"."quiz_attempts" to "authenticated";

grant trigger on table "public"."quiz_attempts" to "authenticated";

grant truncate on table "public"."quiz_attempts" to "authenticated";

grant update on table "public"."quiz_attempts" to "authenticated";

grant delete on table "public"."quiz_attempts" to "service_role";

grant insert on table "public"."quiz_attempts" to "service_role";

grant references on table "public"."quiz_attempts" to "service_role";

grant select on table "public"."quiz_attempts" to "service_role";

grant trigger on table "public"."quiz_attempts" to "service_role";

grant truncate on table "public"."quiz_attempts" to "service_role";

grant update on table "public"."quiz_attempts" to "service_role";

grant delete on table "public"."quiz_options" to "anon";

grant insert on table "public"."quiz_options" to "anon";

grant references on table "public"."quiz_options" to "anon";

grant select on table "public"."quiz_options" to "anon";

grant trigger on table "public"."quiz_options" to "anon";

grant truncate on table "public"."quiz_options" to "anon";

grant update on table "public"."quiz_options" to "anon";

grant delete on table "public"."quiz_options" to "authenticated";

grant insert on table "public"."quiz_options" to "authenticated";

grant references on table "public"."quiz_options" to "authenticated";

grant select on table "public"."quiz_options" to "authenticated";

grant trigger on table "public"."quiz_options" to "authenticated";

grant truncate on table "public"."quiz_options" to "authenticated";

grant update on table "public"."quiz_options" to "authenticated";

grant delete on table "public"."quiz_options" to "service_role";

grant insert on table "public"."quiz_options" to "service_role";

grant references on table "public"."quiz_options" to "service_role";

grant select on table "public"."quiz_options" to "service_role";

grant trigger on table "public"."quiz_options" to "service_role";

grant truncate on table "public"."quiz_options" to "service_role";

grant update on table "public"."quiz_options" to "service_role";

grant delete on table "public"."quiz_questions" to "anon";

grant insert on table "public"."quiz_questions" to "anon";

grant references on table "public"."quiz_questions" to "anon";

grant select on table "public"."quiz_questions" to "anon";

grant trigger on table "public"."quiz_questions" to "anon";

grant truncate on table "public"."quiz_questions" to "anon";

grant update on table "public"."quiz_questions" to "anon";

grant delete on table "public"."quiz_questions" to "authenticated";

grant insert on table "public"."quiz_questions" to "authenticated";

grant references on table "public"."quiz_questions" to "authenticated";

grant select on table "public"."quiz_questions" to "authenticated";

grant trigger on table "public"."quiz_questions" to "authenticated";

grant truncate on table "public"."quiz_questions" to "authenticated";

grant update on table "public"."quiz_questions" to "authenticated";

grant delete on table "public"."quiz_questions" to "service_role";

grant insert on table "public"."quiz_questions" to "service_role";

grant references on table "public"."quiz_questions" to "service_role";

grant select on table "public"."quiz_questions" to "service_role";

grant trigger on table "public"."quiz_questions" to "service_role";

grant truncate on table "public"."quiz_questions" to "service_role";

grant update on table "public"."quiz_questions" to "service_role";

grant delete on table "public"."quizzes" to "anon";

grant insert on table "public"."quizzes" to "anon";

grant references on table "public"."quizzes" to "anon";

grant select on table "public"."quizzes" to "anon";

grant trigger on table "public"."quizzes" to "anon";

grant truncate on table "public"."quizzes" to "anon";

grant update on table "public"."quizzes" to "anon";

grant delete on table "public"."quizzes" to "authenticated";

grant insert on table "public"."quizzes" to "authenticated";

grant references on table "public"."quizzes" to "authenticated";

grant select on table "public"."quizzes" to "authenticated";

grant trigger on table "public"."quizzes" to "authenticated";

grant truncate on table "public"."quizzes" to "authenticated";

grant update on table "public"."quizzes" to "authenticated";

grant delete on table "public"."quizzes" to "service_role";

grant insert on table "public"."quizzes" to "service_role";

grant references on table "public"."quizzes" to "service_role";

grant select on table "public"."quizzes" to "service_role";

grant trigger on table "public"."quizzes" to "service_role";

grant truncate on table "public"."quizzes" to "service_role";

grant update on table "public"."quizzes" to "service_role";

grant delete on table "public"."site_settings" to "anon";

grant insert on table "public"."site_settings" to "anon";

grant references on table "public"."site_settings" to "anon";

grant select on table "public"."site_settings" to "anon";

grant trigger on table "public"."site_settings" to "anon";

grant truncate on table "public"."site_settings" to "anon";

grant update on table "public"."site_settings" to "anon";

grant delete on table "public"."site_settings" to "authenticated";

grant insert on table "public"."site_settings" to "authenticated";

grant references on table "public"."site_settings" to "authenticated";

grant select on table "public"."site_settings" to "authenticated";

grant trigger on table "public"."site_settings" to "authenticated";

grant truncate on table "public"."site_settings" to "authenticated";

grant update on table "public"."site_settings" to "authenticated";

grant delete on table "public"."site_settings" to "service_role";

grant insert on table "public"."site_settings" to "service_role";

grant references on table "public"."site_settings" to "service_role";

grant select on table "public"."site_settings" to "service_role";

grant trigger on table "public"."site_settings" to "service_role";

grant truncate on table "public"."site_settings" to "service_role";

grant update on table "public"."site_settings" to "service_role";


  create policy "Admins can create chatbot items"
  on "public"."chatbot_items"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "Admins can delete chatbot items"
  on "public"."chatbot_items"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "Admins can read chatbot items"
  on "public"."chatbot_items"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "Admins can update chatbot items"
  on "public"."chatbot_items"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "Public can read active chatbot items"
  on "public"."chatbot_items"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));



  create policy "Admins can delete contact messages"
  on "public"."contact_messages"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "Admins can read contact messages"
  on "public"."contact_messages"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "Admins can update contact messages"
  on "public"."contact_messages"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "Public can create contact messages"
  on "public"."contact_messages"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Admins can manage certificates"
  on "public"."course_certificates"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "Public can verify valid certificates"
  on "public"."course_certificates"
  as permissive
  for select
  to anon, authenticated
using ((status = 'valid'::text));



  create policy "Users can create own certificates"
  on "public"."course_certificates"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can read own certificates"
  on "public"."course_certificates"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Authenticated users can enroll in courses"
  on "public"."course_enrollments"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Authenticated users can read own course enrollments"
  on "public"."course_enrollments"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Authenticated users can create course progress"
  on "public"."course_progress"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can delete course progress"
  on "public"."course_progress"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can read course progress"
  on "public"."course_progress"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can update course progress"
  on "public"."course_progress"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Authenticated users can create courses"
  on "public"."courses"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can delete courses"
  on "public"."courses"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can read all courses"
  on "public"."courses"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can update courses"
  on "public"."courses"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Public can read published courses"
  on "public"."courses"
  as permissive
  for select
  to public
using ((status = 'published'::text));



  create policy "Admins can delete donation methods"
  on "public"."donation_methods"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "Admins can insert donation methods"
  on "public"."donation_methods"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "Admins can read all donation methods"
  on "public"."donation_methods"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "Admins can update donation methods"
  on "public"."donation_methods"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "Public can read active donation methods"
  on "public"."donation_methods"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));



  create policy "Authenticated users can read event registrations"
  on "public"."event_registrations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Public can create event registrations"
  on "public"."event_registrations"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Authenticated users can create events"
  on "public"."events"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can delete events"
  on "public"."events"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can read all events"
  on "public"."events"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can update events"
  on "public"."events"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Public can read published events"
  on "public"."events"
  as permissive
  for select
  to public
using ((status = 'published'::text));



  create policy "Authenticated users can create lessons"
  on "public"."lessons"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can delete lessons"
  on "public"."lessons"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can read all lessons"
  on "public"."lessons"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can update lessons"
  on "public"."lessons"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Public can read lessons from published courses"
  on "public"."lessons"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = lessons.course_id) AND (courses.status = 'published'::text)))));



  create policy "Admins can create live streams"
  on "public"."live_streams"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "Admins can delete live streams"
  on "public"."live_streams"
  as permissive
  for delete
  to authenticated
using (public.is_admin());



  create policy "Admins can read all live streams"
  on "public"."live_streams"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "Admins can update live streams"
  on "public"."live_streams"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "Public can read published live streams"
  on "public"."live_streams"
  as permissive
  for select
  to public
using ((status = 'published'::text));



  create policy "Permitir actualizar noticias a usuarios autenticados"
  on "public"."news"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Permitir crear noticias a usuarios autenticados"
  on "public"."news"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Permitir eliminar noticias a usuarios autenticados"
  on "public"."news"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Permitir lectura publica de noticias"
  on "public"."news"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "Users can read own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Authenticated admins can create publications"
  on "public"."publications"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Authenticated admins can delete publications"
  on "public"."publications"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Authenticated admins can read all publications"
  on "public"."publications"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Authenticated admins can update publications"
  on "public"."publications"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Public can read published publications"
  on "public"."publications"
  as permissive
  for select
  to public
using ((status = 'published'::text));



  create policy "Authenticated users can create quiz attempts"
  on "public"."quiz_attempts"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can manage quiz attempts"
  on "public"."quiz_attempts"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Authenticated users can read all quiz attempts"
  on "public"."quiz_attempts"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can read own quiz attempts"
  on "public"."quiz_attempts"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Authenticated users can manage quiz options"
  on "public"."quiz_options"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Public can read options from published quizzes"
  on "public"."quiz_options"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.quiz_questions
     JOIN public.quizzes ON ((quizzes.id = quiz_questions.quiz_id)))
  WHERE ((quiz_questions.id = quiz_options.question_id) AND (quizzes.status = 'published'::text)))));



  create policy "Authenticated users can manage quiz questions"
  on "public"."quiz_questions"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Public can read questions from published quizzes"
  on "public"."quiz_questions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.quizzes
  WHERE ((quizzes.id = quiz_questions.quiz_id) AND (quizzes.status = 'published'::text)))));



  create policy "Authenticated users can create quizzes"
  on "public"."quizzes"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can delete quizzes"
  on "public"."quizzes"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can read all quizzes"
  on "public"."quizzes"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can update quizzes"
  on "public"."quizzes"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Public can read published quizzes"
  on "public"."quizzes"
  as permissive
  for select
  to public
using ((status = 'published'::text));



  create policy "Admins can create site settings"
  on "public"."site_settings"
  as permissive
  for insert
  to authenticated
with check (public.is_admin());



  create policy "Admins can update site settings"
  on "public"."site_settings"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "Public can read site settings"
  on "public"."site_settings"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER set_chatbot_items_updated_at BEFORE UPDATE ON public.chatbot_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_contact_messages_updated_at BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_course_certificates_updated_at BEFORE UPDATE ON public.course_certificates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER donation_methods_set_updated_at BEFORE UPDATE ON public.donation_methods FOR EACH ROW EXECUTE FUNCTION public.set_donation_methods_updated_at();

CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_live_streams_updated_at BEFORE UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_publications_updated_at BEFORE UPDATE ON public.publications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


  create policy "Permitir leer imagenes de noticias"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'news-images'::text));



  create policy "Permitir subir imagenes de noticias"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'news-images'::text));



