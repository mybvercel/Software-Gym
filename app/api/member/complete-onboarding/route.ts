import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const {
      member_id,
      birth_date,
      gender,
      height_cm,
      goal,
      experience_level,
      days_per_week,
      injuries,
      objectives_detail,
    } = await request.json();

    if (!member_id)
      return Response.json({ error: "member_id requerido." }, { status: 400 });

    // Update profile
    await admin
      .from("profiles")
      .update({
        birth_date: birth_date || null,
        gender: gender || null,
        onboarding_completed: true,
      })
      .eq("id", member_id);

    // Save height separately so a missing height_cm column never breaks onboarding
    if (height_cm != null) {
      const { error: hErr } = await admin
        .from("profiles")
        .update({ height_cm })
        .eq("id", member_id);
      if (hErr) console.warn("height_cm not saved (¿falta la columna?):", hErr.message);
    }

    // Upsert member_goals
    await admin.from("member_goals").upsert(
      {
        member_id,
        goal,
        experience_level,
        days_per_week,
        injuries: injuries || null,
        objectives_detail: objectives_detail || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" }
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Complete onboarding error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
