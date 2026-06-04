import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  signSession, MEMBER_COOKIE, COOKIE_MAX_AGE,
  deriveMemberPassword, memberAuthEmail,
} from "@/lib/session";

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

    if (!full_name?.trim() || !dni?.trim())
      return NextResponse.json({ error: "Nombre y DNI son requeridos." }, { status: 400 });

    const cleanDNI = dni.replace(/\D/g, "").trim();

    // 1. Find gym
    const { data: gym } = await admin
      .from("gyms")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!gym)
      return NextResponse.json({ error: "Gimnasio no encontrado." }, { status: 404 });

    // 2. Find existing member by DNI
    interface MemberRow {
      id: string; full_name: string; role: string;
      is_active: boolean; onboarding_completed: boolean;
    }
    const found = await admin
      .from("profiles")
      .select("id, full_name, role, is_active, onboarding_completed")
      .eq("gym_id", gym.id)
      .eq("dni", cleanDNI)
      .maybeSingle();
    let profile: MemberRow | null = found.data as MemberRow | null;

    const email = memberAuthEmail(gym.id, cleanDNI);
    const password = await deriveMemberPassword(gym.id, cleanDNI);

    // 3. If new, create the member auth account + profile
    if (!profile) {
      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim(), role: "member" },
      });
      if (authErr || !authUser?.user) {
        console.error("Member auth create error:", authErr?.message);
        return NextResponse.json({ error: "No se pudo crear tu perfil." }, { status: 500 });
      }
      await admin.from("profiles").update({
        gym_id: gym.id, role: "member", full_name: full_name.trim(),
        dni: cleanDNI, is_active: true, onboarding_completed: false,
        whatsapp_notifications: true,
      }).eq("id", authUser.user.id);

      profile = {
        id: authUser.user.id, full_name: full_name.trim(),
        role: "member", is_active: true, onboarding_completed: false,
      };
    }

    if (!profile.is_active)
      return NextResponse.json({ error: "Tu cuenta está inactiva. Hablá con tu profesor." }, { status: 403 });

    // 4. Sign the member into Supabase Auth → sets session cookies (RLS works)
    const cookieJar: { name: string; value: string; options: Record<string, unknown> }[] = [];
    const ssr = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
          setAll: (list) => list.forEach(c => cookieJar.push(c)),
        },
      }
    );

    const { error: signErr } = await ssr.auth.signInWithPassword({ email, password });
    if (signErr) console.error("Member sign-in error:", signErr.message);

    // 5. Record attendance
    await admin.from("attendance").insert({
      gym_id: gym.id, member_id: profile.id, method: "app",
    });

    // 6. Build response with all cookies
    const sessionProfile = {
      id: profile.id, name: profile.full_name,
      gym_id: gym.id, gym_slug: gym.slug, role: profile.role,
    };
    const token = await signSession(sessionProfile);

    const res = NextResponse.json({
      profile: sessionProfile,
      needsOnboarding: !profile.onboarding_completed,
    });

    // HMAC member cookie (middleware guard + UX)
    res.cookies.set(MEMBER_COOKIE, token, {
      httpOnly: true, sameSite: "strict", path: "/",
      maxAge: COOKIE_MAX_AGE, secure: process.env.NODE_ENV === "production",
    });
    // Supabase session cookies (enables RLS)
    cookieJar.forEach(({ name, value, options }) => res.cookies.set(name, value, options));

    return res;
  } catch (err) {
    console.error("Member login error:", err);
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
  }
}
