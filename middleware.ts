import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifySession, MEMBER_COOKIE } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Supabase SSR: auto-refresh trainer sessions ──────────
  // This keeps the Supabase Auth JWT alive without requiring re-login
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh Supabase session (non-blocking)
  await supabase.auth.getUser();

  // ── 2. Protect member dashboard routes ──────────────────────
  const isMemberRoute = pathname.includes("/dashboard/member");

  if (isMemberRoute) {
    const cookieHeader = request.cookies.get(MEMBER_COOKIE)?.value;
    const session = cookieHeader ? verifySession(cookieHeader) : null;

    if (!session) {
      // Extract gym slug from path: /gym/[slug]/dashboard/member/...
      const slugMatch = pathname.match(/^\/gym\/([^/]+)/);
      const slug = slugMatch?.[1] ?? "antigravity";
      const loginUrl = new URL(`/gym/${slug}/login?role=member`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 3. Protect trainer dashboard routes ─────────────────────
  const isTrainerRoute = pathname.includes("/dashboard/trainer");

  if (isTrainerRoute) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const slugMatch = pathname.match(/^\/gym\/([^/]+)/);
      const slug = slugMatch?.[1] ?? "antigravity";
      const loginUrl = new URL(`/gym/${slug}/login?role=trainer`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
