"use server";

import { revalidatePath } from "next/cache";
import { renderCourseWelcomeEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/mailer";
import { siteUrl } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type EnrollInCourseResult =
  | { success: true; message: string }
  | { success: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Inscribe al usuario con SU sesión (RLS: solo puede inscribirse a sí mismo)
 * y, solo si la inscripción es nueva, envía el correo de bienvenida. Si el
 * correo falla, la inscripción se conserva.
 */
export async function enrollInCourse(courseId: string): Promise<EnrollInCourseResult> {
  try {
    if (!UUID_PATTERN.test(courseId)) return { success: false, error: "El curso no es válido." };

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Debes iniciar sesión para inscribirte." };

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id,title,slug,status")
      .eq("id", courseId)
      .eq("status", "published")
      .maybeSingle();
    if (courseError || !course) return { success: false, error: "Curso no encontrado." };

    const { error: insertError } = await supabase
      .from("course_enrollments")
      .insert({ course_id: course.id, user_id: user.id });

    if (insertError) {
      if (insertError.code === "23505") {
        // Ya inscrito: no se envía otra bienvenida.
        return { success: true, message: "Ya estás inscrito en este curso." };
      }
      console.error("Error al inscribir en el curso:", insertError);
      return { success: false, error: "No pudimos completar tu inscripción." };
    }

    revalidatePath(`/formacion/${course.slug}`);
    revalidatePath("/mis-cursos");

    if (user.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();

      await sendEmail(
        {
          to: user.email,
          subject: `Bienvenido al curso: ${course.title}`,
          html: renderCourseWelcomeEmail({
            recipientName: profile?.first_name?.trim() || "estudiante",
            courseTitle: course.title,
            courseUrl: `${siteUrl}/formacion/${encodeURIComponent(course.slug)}`,
            myCoursesUrl: `${siteUrl}/mis-cursos`,
          }),
        },
        "bienvenida a curso"
      );
    }

    return { success: true, message: "Inscripción completada." };
  } catch (error) {
    console.error("Error inesperado al inscribir en el curso:", error);
    return { success: false, error: "No pudimos completar tu inscripción." };
  }
}
