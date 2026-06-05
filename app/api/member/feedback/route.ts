import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";
import { arDateOnly } from "@/lib/datetime";

/** General feedback / suggestion from a member to the gym (trainer sees it). */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { member_id, comment, rating } = await request.json();
    if (!member_id || !comment?.trim())
      return Response.json({ error: "Escribí tu comentario." }, { status: 400 });

    const { data: member } = await admin
      .from("profiles")
      .select("full_name, gym_id")
      .eq("id", member_id)
      .single();
    if (!member) return Response.json({ error: "Alumno no encontrado." }, { status: 404 });

    const { data: staff } = await admin
      .from("profiles")
      .select("id")
      .eq("gym_id", member.gym_id)
      .in("role", ["owner", "trainer"]);

    const metadata = {
      member_id,
      member_name: member.full_name,
      kind: "general",
      comment: comment.trim(),
      rating: rating ?? null,
      session_date: arDateOnly(),
    };

    const rows = (staff ?? []).map((s) => ({
      user_id: s.id,
      type: "member_feedback",
      title: `${member.full_name} envió un comentario`,
      body: comment.trim() + (rating ? ` · ${rating}/5` : ""),
      is_read: false,
      metadata,
    }));

    if (rows.length > 0) await admin.from("notifications").insert(rows);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Member feedback error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
