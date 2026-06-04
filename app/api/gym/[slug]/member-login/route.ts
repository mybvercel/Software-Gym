import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { signSession, MEMBER_COOKIE, COOKIE_MAX_AGE } from "@/lib/session";

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

    // 1. Find gym
    const { data: gym, error: gymErr } = await admin
      .from("gyms")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (gymErr || !gym) {
      return Response.json({ error: "Gimnasio no encontrado." }, { status: 404 });
    }

    // 2. Find or create profile
    const { data: existing } = await admin
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("gym_id", gym.id)
      .eq("dni", dni.trim())
      .maybeSingle();

    let profileId: string;
    let profileName: string;
    let profileRole: string;

    if (existing) {
      if (!existing.is_active) {
        return Response.json(
          { error: "Tu cuenta está inactiva. Hablá con tu profesor." },
          { status: 403 }
        );
      }
      profileId   = existing.id;
      profileName = existing.full_name;
      profileRole = existing.role;
    } else {
      // Create new member
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
        return Response.json(
          { error: "Error al crear el perfil. Intentá nuevamente." },
          { status: 500 }
        );
      }
      profileId   = newProfile.id;
      profileName = newProfile.full_name;
      profileRole = newProfile.role;
    }

    // 3. Record attendance
    await admin.from("attendance").insert({
      gym_id: gym.id,
      member_id: profileId,
      method: "app",
    });

    // 4. Sign a secure session token
    const token = signSession({
      id:       profileId,
      name:     profileName,
      gym_id:   gym.id,
      gym_slug: gym.slug,
      role:     profileRole,
    });

    // 5. Set HttpOnly cookie + return profile for localStorage fallback
    const cookieValue = `${MEMBER_COOKIE}=${token}; Max-Age=${COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

    return new Response(
      JSON.stringify({
        profile: { id: profileId, name: profileName, gym_id: gym.id, gym_slug: gym.slug, role: profileRole },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieValue,
        },
      }
    );
  } catch (err) {
    console.error("Member login error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}
