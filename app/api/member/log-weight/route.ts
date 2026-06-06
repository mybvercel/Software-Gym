import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

/**
 * Logs a weight entry for a member. Accepts an existing exercise_id OR a
 * free-typed exercise_name (which is found-or-created in the member's gym,
 * since members can't insert exercises directly via RLS).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { member_id, exercise_id, exercise_name, weight_kg, reps } = await request.json();

    if (!member_id || weight_kg == null)
      return Response.json({ error: "Datos incompletos." }, { status: 400 });

    // Member's gym
    const { data: member } = await admin
      .from("profiles")
      .select("gym_id")
      .eq("id", member_id)
      .single();
    if (!member) return Response.json({ error: "Alumno no encontrado." }, { status: 404 });

    let exId: string | null = exercise_id ?? null;

    // Free-typed exercise → find or create in this gym
    if (!exId && exercise_name?.trim()) {
      const name = exercise_name.trim();
      const { data: found } = await admin
        .from("exercises")
        .select("id")
        .or(`gym_id.eq.${member.gym_id},gym_id.is.null`)
        .ilike("name", name)
        .limit(1)
        .maybeSingle();

      if (found) {
        exId = found.id;
      } else {
        const { data: created, error: cErr } = await admin
          .from("exercises")
          .insert({ gym_id: member.gym_id, name, muscle_group: "full_body", is_active: true })
          .select("id")
          .single();
        if (cErr || !created) {
          console.error("Exercise create error:", cErr?.message);
          return Response.json({ error: "No se pudo crear el ejercicio." }, { status: 500 });
        }
        exId = created.id;
      }
    }

    if (!exId) return Response.json({ error: "Elegí o escribí un ejercicio." }, { status: 400 });

    const { error: logErr } = await admin.from("progress_logs").insert({
      member_id,
      exercise_id: exId,
      weight_kg: Number(weight_kg),
      reps_completed: reps?.trim() || null,
      logged_at: new Date().toISOString(),
    });
    if (logErr) {
      console.error("Progress log error:", logErr.message);
      return Response.json({ error: "No se pudo guardar." }, { status: 500 });
    }

    return Response.json({ ok: true, exercise_id: exId });
  } catch (err) {
    console.error("Log weight error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
