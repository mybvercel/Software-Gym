import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ── POST /api/gym/[slug]/members — create one or many members ── */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Accept single object or array (for bulk import)
    const rows: { full_name: string; dni: string; phone?: string }[] =
      Array.isArray(body) ? body : [body];

    if (rows.length === 0)
      return Response.json({ error: "Sin datos." }, { status: 400 });

    // Get gym
    const { data: gym } = await admin
      .from("gyms")
      .select("id, slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!gym)
      return Response.json({ error: "Gimnasio no encontrado." }, { status: 404 });

    const today = new Date().toISOString().split("T")[0];
    const subscriptionEnd = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .split("T")[0];

    const created: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const row of rows) {
      const dni = row.dni?.replace(/\D/g, "").trim();
      const name = row.full_name?.trim();

      if (!name || !dni) { errors.push(row.full_name ?? "sin nombre"); continue; }

      // Check for existing profile with same gym+DNI
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("gym_id", gym.id)
        .eq("dni", dni)
        .maybeSingle();

      if (existing) { skipped.push(name); continue; }

      // Create profile
      const { data: profile, error: profileErr } = await admin
        .from("profiles")
        .insert({
          gym_id: gym.id,
          role: "member",
          full_name: name,
          email: `${dni}@gymos.local`,
          dni,
          phone: row.phone?.trim() || null,
          is_active: true,
          onboarding_completed: false,
          whatsapp_notifications: true,
        })
        .select("id")
        .single();

      if (profileErr || !profile) { errors.push(name); continue; }

      // Create initial subscription payment record
      await admin.from("payments").insert({
        gym_id: gym.id,
        member_id: profile.id,
        amount: 0,
        currency: "ARS",
        status: "approved",
        payment_method: "manual",
        period_from: today,
        period_to: subscriptionEnd,
        paid_at: new Date().toISOString(),
      });

      created.push(name);
    }

    return Response.json({ created, skipped, errors });
  } catch (err) {
    console.error("Create member error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
