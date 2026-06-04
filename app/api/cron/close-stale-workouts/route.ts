import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STALE_HOURS = 3;

/**
 * Auto-closes workouts that were started but never finished.
 * If a member tapped "Empezar entrenamiento" and ≥3h passed without ending
 * the session, we close it automatically and record it as finished so the
 * trainer's live count is accurate and the session shows up as terminated.
 *
 * Called lazily (no external cron needed) whenever the trainer panel polls
 * or a member opens the app. Safe to call repeatedly — it's idempotent:
 * only the call that actually deletes a marker records the closure.
 */
export async function POST() {
  try {
    const threshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

    // Active markers older than the threshold
    const { data: stale } = await admin
      .from("notifications")
      .select("metadata, created_at")
      .eq("type", "workout_active")
      .lt("created_at", threshold);

    if (!stale || stale.length === 0) return Response.json({ closed: 0 });

    // Unique members with a stale session
    const byMember = new Map<string, any>();
    for (const n of stale) {
      const mid = (n.metadata as any)?.member_id;
      if (mid && !byMember.has(mid)) byMember.set(mid, n.metadata);
    }

    let closed = 0;

    for (const [memberId, meta] of byMember) {
      // Delete the live markers — capture rows so only one caller records the close
      const { data: removed } = await admin
        .from("notifications")
        .delete()
        .eq("type", "workout_active")
        .filter("metadata->>member_id", "eq", memberId)
        .select("id");

      if (!removed || removed.length === 0) continue; // someone else already closed it

      const startedAt = (meta as any)?.started_at ?? threshold;

      // Member + gym staff
      const { data: member } = await admin
        .from("profiles")
        .select("full_name, gym_id")
        .eq("id", memberId)
        .single();
      if (!member) continue;

      // What did they actually log during this session?
      const { count: exercisesDone } = await admin
        .from("progress_logs")
        .select("id", { count: "exact", head: true })
        .eq("member_id", memberId)
        .gte("logged_at", startedAt);

      const { data: staff } = await admin
        .from("profiles")
        .select("id")
        .eq("gym_id", member.gym_id)
        .in("role", ["owner", "trainer"]);

      const metadata = {
        member_id: memberId,
        member_name: member.full_name,
        auto_closed: true,
        mood: null,
        mood_label: null,
        comment: "Sesión cerrada automáticamente (no se marcó como terminada).",
        day_name: (meta as any)?.day_name ?? null,
        exercises_done: exercisesDone ?? 0,
        session_date: new Date(startedAt).toISOString().split("T")[0],
      };

      const rows = (staff ?? []).map((s) => ({
        user_id: s.id,
        type: "session_feedback",
        title: `${member.full_name} — sesión cerrada automáticamente`,
        body: `Cerrada tras ${STALE_HOURS}h sin marcar como terminada · ${exercisesDone ?? 0} ejercicios registrados`,
        is_read: false,
        metadata,
      }));

      if (rows.length > 0) await admin.from("notifications").insert(rows);
      closed++;
    }

    return Response.json({ closed });
  } catch (err) {
    console.error("Close stale workouts error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
