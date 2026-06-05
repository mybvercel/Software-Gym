import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";
import { arDayStartISO } from "@/lib/datetime";

/**
 * Tracks a member's LIVE training session so the trainer panel can show
 * how many students are working out right now.
 *
 * Uses the existing notifications table (type = 'workout_active') —
 * one marker row per gym trainer/owner, removed when the member finishes.
 *
 * action: "start" → member opened/began the workout
 * action: "end"   → member finished or left the workout
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { action, member_id, day_name } = await request.json();
    if (!member_id || !["start", "end"].includes(action))
      return Response.json({ error: "Datos inválidos." }, { status: 400 });

    // Always clear any previous live marker for this member first
    await admin
      .from("notifications")
      .delete()
      .eq("type", "workout_active")
      .filter("metadata->>member_id", "eq", member_id);

    if (action === "end") return Response.json({ ok: true });

    // action === "start": create fresh markers
    const { data: member } = await admin
      .from("profiles")
      .select("full_name, gym_id")
      .eq("id", member_id)
      .single();

    if (!member) return Response.json({ error: "Alumno no encontrado." }, { status: 404 });

    // Record attendance for TODAY (real training, not just opening the app).
    // Deduped: only one attendance row per member per day (Córdoba).
    const { data: alreadyToday } = await admin
      .from("attendance")
      .select("id")
      .eq("member_id", member_id)
      .gte("checked_in_at", arDayStartISO())
      .maybeSingle();
    if (!alreadyToday) {
      await admin.from("attendance").insert({
        gym_id: member.gym_id, member_id, method: "app",
      });
    }

    const { data: staff } = await admin
      .from("profiles")
      .select("id")
      .eq("gym_id", member.gym_id)
      .in("role", ["owner", "trainer"]);

    const metadata = {
      member_id,
      member_name: member.full_name,
      day_name: day_name ?? null,
      started_at: new Date().toISOString(),
    };

    const rows = (staff ?? []).map((s) => ({
      user_id: s.id,
      type: "workout_active",
      title: `${member.full_name} está entrenando`,
      body: day_name ? `Entrenando: ${day_name}` : "Sesión en curso",
      is_read: false,
      metadata,
    }));

    if (rows.length > 0) await admin.from("notifications").insert(rows);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Workout session error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
