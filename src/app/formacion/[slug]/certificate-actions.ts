"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildCourseProgressState } from "@/lib/course-progress";
import {
  buildCertificateCode,
  toCertificateViewModel,
  type CourseCertificateRecord,
  type CertificateViewModel,
} from "@/lib/certificates";

type CertificateActionResult =
  | { ok: true; certificate: CertificateViewModel }
  | {
      ok: false;
      reason: "profile_required";
      message: string;
      email: string;
      firstName: string;
      lastName: string;
    }
  | { ok: false; message: string };

function resolveStudentName({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();
  return fullName || email || "Estudiante IVBCC";
}

export async function getOrCreateCourseCertificate(
  courseId: string,
  profileInput?: { firstName?: string; lastName?: string }
): Promise<CertificateActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Debes iniciar sesión para generar el certificado." };
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id,title,slug,status")
      .eq("id", courseId)
      .eq("status", "published")
      .maybeSingle();

    if (courseError || !course) {
      return { ok: false, message: "Curso no encontrado." };
    }

    const { data: enrollment } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!enrollment) {
      return { ok: false, message: "Debes estar inscrito en el curso." };
    }

    const [
      { data: lessons, error: lessonsError },
      { data: quizzes, error: quizzesError },
    ] = await Promise.all([
      supabase
        .from("lessons")
        .select('id,"order"')
        .eq("course_id", course.id)
        .order("order", { ascending: true }),
      supabase
        .from("quizzes")
        .select("id,lesson_id")
        .eq("course_id", course.id)
        .eq("status", "published"),
    ]);

    if (lessonsError || quizzesError) {
      return { ok: false, message: "No pudimos validar tu progreso." };
    }

    const quizIds = (quizzes || []).map((quiz) => quiz.id);
    const { data: quizAttempts, error: quizAttemptsError } = quizIds.length
      ? await supabase
          .from("quiz_attempts")
          .select("quiz_id,score,total_questions,created_at")
          .eq("user_id", user.id)
          .in("quiz_id", quizIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

    if (quizAttemptsError) {
      return { ok: false, message: "No pudimos validar tus quizzes." };
    }

    const progressState = buildCourseProgressState({
      lessons: (lessons || []).map((lesson) => ({
        id: lesson.id,
        order: lesson.order,
      })),
      quizzes: (quizzes || []).map((quiz) => ({
        id: quiz.id,
        lesson_id: quiz.lesson_id,
      })),
      attempts: quizAttempts || [],
      isEnrolled: true,
    });

    if (!progressState.certificateAvailable) {
      return {
        ok: false,
        message:
          "El certificado se habilita cuando completas todas las lecciones y apruebas el quiz final.",
      };
    }

    const { data: existingCertificate, error: existingCertificateError } =
      await supabase
        .from("course_certificates")
        .select("id,code,user_id,course_id,student_name,course_title,issued_at,status")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();

    if (existingCertificateError) {
      return {
        ok: false,
        message: `No pudimos consultar tu certificado: ${existingCertificateError.message}`,
      };
    }

    if (existingCertificate) {
      return {
        ok: true,
        certificate: toCertificateViewModel(
          existingCertificate as CourseCertificateRecord
        ),
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name,last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { ok: false, message: `No pudimos consultar tu perfil: ${profileError.message}` };
    }

    const inputFirstName = profileInput?.firstName?.trim() || "";
    const inputLastName = profileInput?.lastName?.trim() || "";
    const firstName = inputFirstName || profile?.first_name?.trim() || "";
    const lastName = inputLastName || profile?.last_name?.trim() || "";

    if (!firstName || !lastName) {
      return {
        ok: false,
        reason: "profile_required",
        message: "Completa los datos para tu certificado.",
        email: user.email || "",
        firstName,
        lastName,
      };
    }

    if (
      inputFirstName ||
      inputLastName ||
      profile?.first_name !== firstName ||
      profile?.last_name !== lastName
    ) {
      const { error: updateProfileError } = await supabase.from("profiles").upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
      });

      if (updateProfileError) {
        return {
          ok: false,
          message: `No pudimos guardar tus datos de perfil: ${updateProfileError.message}`,
        };
      }
    }

    const studentName = resolveStudentName({
      firstName,
      lastName,
      email: user.email,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: certificate, error: insertError } = await supabase
        .from("course_certificates")
        .insert({
          code: buildCertificateCode(),
          user_id: user.id,
          course_id: course.id,
          student_name: studentName,
          course_title: course.title,
          status: "valid",
        })
        .select("id,code,user_id,course_id,student_name,course_title,issued_at,status")
        .single();

      if (!insertError && certificate) {
        revalidatePath(`/formacion/${course.slug}`);
        return {
          ok: true,
          certificate: toCertificateViewModel(
            certificate as CourseCertificateRecord
          ),
        };
      }

      if (insertError?.code === "23505") {
        const { data: existingAfterConflict } = await supabase
          .from("course_certificates")
          .select("id,code,user_id,course_id,student_name,course_title,issued_at,status")
          .eq("user_id", user.id)
          .eq("course_id", course.id)
          .maybeSingle();

        if (existingAfterConflict) {
          return {
            ok: true,
            certificate: toCertificateViewModel(
              existingAfterConflict as CourseCertificateRecord
            ),
          };
        }

        continue;
      }

      return {
        ok: false,
        message: `No pudimos crear el certificado: ${insertError?.message || "Error desconocido."}`,
      };
    }

    return {
      ok: false,
      message: "No pudimos generar un código único para el certificado.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Error generando certificado: ${error.message}`
          : "Error generando certificado.",
    };
  }
}
