import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

const MOOD_LABELS: Record<string, string> = {
  great: "Muy bien", good: "Bien", normal: "Normal",
  tired: "Cansado", exhausted: "Agotado",
};

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const {
      member_id, mood, comment,
      routine_name, day_name,
      exercises_done, total_volume_kg, duration_min,
    } = await request.json();

    if (!member_id)
      return Response.json({ error: "member_id requerido." }, { status: 400 });

    // Member + gym
    const { data: member } = await admin
      .from("profiles")
      .select("full_name, gym_id")
      .eq("id", member_id)
      .single();

    if (!member)
      return Response.json({ error: "Alumno no encontrado." }, { status: 404 });

    // All trainers / owners of the gym (they will see the feedback)
    const { data: staff } = await admin
      .from("profiles")
      .select("id")
      .eq("gym_id", member.gym_id)
      .in("role", ["owner", "trainer"]);

    const metadata = {
      member_id,
      member_name: member.full_name,
      mood: mood ?? null,
      mood_label: mood ? MOOD_LABELS[mood] ?? mood : null,
      comment: comment?.trim() || null,
      routine_name: routine_name ?? null,
      day_name: day_name ?? null,
      exercises_done: exercises_done ?? null,
      total_volume_kg: total_volume_kg ?? null,
      duration_min: duration_min ?? null,
      session_date: new Date().toISOString().split("T")[0],
    };

    const title = `${member.full_name} completó su sesión${day_name ? ` (${day_name})` : ""}`;
    const body =
      (comment?.trim() ? `"${comment.trim()}"` : "Sin comentario") +
      (mood ? ` · Se sintió: ${MOOD_LABELS[mood] ?? mood}` : "");

    // One notification per staff member (RLS shows each their own copy)
    const rows = (staff ?? []).map((s) => ({
      user_id: s.id,
      type: "session_feedback",
      title,
      body,
      is_read: false,
      metadata,
    }));

    if (rows.length > 0) {
      const { error } = await admin.from("notifications").insert(rows);
      if (error) {
        console.error("Feedback insert error:", error.message);
        return Response.json({ error: "No se pudo guardar." }, { status: 500 });
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Session feedback error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
