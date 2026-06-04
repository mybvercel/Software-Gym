import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const {
      member_id,
      birth_date,
      gender,
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
