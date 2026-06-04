import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// Service role client — bypasses RLS, runs server-side only
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { full_name, dni } = await request.json();

    if (!full_name?.trim() || !dni?.trim()) {
      return Response.json({ error: "Nombre y DNI son requeridos." }, { status: 400 });
    }

    // 1. Find gym by slug
    const { data: gym, error: gymErr } = await admin
      .from("gyms")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (gymErr || !gym) {
      return Response.json({ error: "Gimnasio no encontrado." }, { status: 404 });
    }

    // 2. Find existing profile by DNI + gym
    const { data: existing } = await admin
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("gym_id", gym.id)
      .eq("dni", dni.trim())
      .maybeSingle();

    if (existing) {
      if (!existing.is_active) {
        return Response.json({ error: "Tu cuenta está inactiva. Hablá con tu profesor." }, { status: 403 });
      }

      // Record attendance
      await admin.from("attendance").insert({
        gym_id: gym.id,
        member_id: existing.id,
        method: "app",
      });

      return Response.json({
        profile: {
          id: existing.id,
          name: existing.full_name,
          gym_id: gym.id,
          gym_slug: gym.slug,
          role: existing.role,
        },
      });
    }

    // 3. Create new member profile
    const { data: newProfile, error: insertErr } = await admin
      .from("profiles")
      .insert({
        gym_id: gym.id,
        role: "member",
        full_name: full_name.trim(),
        email: `${dni.trim()}@gymos.local`,
        dni: dni.trim(),
        is_active: true,
        onboarding_completed: false,
        whatsapp_notifications: true,
      })
      .select("id, full_name, role")
      .single();

    if (insertErr || !newProfile) {
      console.error("Profile insert error:", insertErr);
      return Response.json({ error: "Error al crear el perfil. Intentá nuevamente." }, { status: 500 });
    }

    return Response.json({
      profile: {
        id: newProfile.id,
        name: newProfile.full_name,
        gym_id: gym.id,
        gym_slug: gym.slug,
        role: newProfile.role,
      },
    });
  } catch (err) {
    console.error("Member login error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
