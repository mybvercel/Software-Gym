import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";
import { deriveMemberPassword, memberAuthEmail } from "@/lib/session";

/**
 * Creates a member as a real Supabase Auth user.
 * This satisfies the profiles → auth.users FK and lets the member
 * later get a real auth session (so RLS protects their data per-user).
 */
async function createMember(
  gymId: string,
  name: string,
  dni: string,
  phone?: string
): Promise<"created" | "exists" | "error"> {
  const admin = createAdminClient();
  // Already exists in this gym?
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("gym_id", gymId)
    .eq("dni", dni)
    .maybeSingle();
  if (existing) return "exists";

  const email = memberAuthEmail(gymId, dni);
  const password = await deriveMemberPassword(gymId, dni);

  // Create the auth user (trigger auto-creates the profile row)
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role: "member" },
  });

  if (authErr || !authUser?.user) {
    // Email collision (same gym+DNI) → treat as existing
    if (authErr?.message?.toLowerCase().includes("already")) return "exists";
    console.error("Auth create error:", authErr?.message);
    return "error";
  }

  // Fill in the profile details
  const { error: updErr } = await admin
    .from("profiles")
    .update({
      gym_id: gymId,
      role: "member",
      full_name: name,
      dni,
      phone: phone || null,
      is_active: true,
      onboarding_completed: false,
      whatsapp_notifications: true,
    })
    .eq("id", authUser.user.id);

  if (updErr) {
    console.error("Profile update error:", updErr.message);
    return "error";
  }

  // Initial 30-day subscription
  const today = new Date().toISOString().split("T")[0];
  const end = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  await admin.from("payments").insert({
    gym_id: gymId,
    member_id: authUser.user.id,
    amount: 0,
    currency: "ARS",
    status: "approved",
    payment_method: "manual",
    period_from: today,
    period_to: end,
    paid_at: new Date().toISOString(),
  });

  return "created";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const admin = createAdminClient();
    const { slug } = await params;
    const body = await request.json();
    const rows: { full_name: string; dni: string; phone?: string }[] =
      Array.isArray(body) ? body : [body];

    if (rows.length === 0)
      return Response.json({ error: "Sin datos." }, { status: 400 });

    const { data: gym } = await admin
      .from("gyms")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!gym)
      return Response.json({ error: "Gimnasio no encontrado." }, { status: 404 });

    const created: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const row of rows) {
      const dni = row.dni?.replace(/\D/g, "").trim();
      const name = row.full_name?.trim();
      if (!name || !dni || dni.length < 7) { errors.push(name || "sin nombre"); continue; }

      const result = await createMember(gym.id, name, dni, row.phone?.trim());
      if (result === "created") created.push(name);
      else if (result === "exists") skipped.push(name);
      else errors.push(name);
    }

    return Response.json({ created, skipped, errors });
  } catch (err) {
    console.error("Create member error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
