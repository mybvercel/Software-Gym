import { NextRequest, NextResponse } from "next/server";
import { verifySession, MEMBER_COOKIE } from "@/lib/session";

/**
 * Lightweight middleware — NO network calls.
 * Only verifies cookies locally so it adds <1ms per request.
 *
 * - Member dashboard: verify the HMAC-signed session cookie (local crypto).
 * - Trainer dashboard: check the Supabase auth cookie is present
 *   (full validation happens client-side via getUser() + RLS on the data).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Member dashboard routes ──────────────────────────────────
  if (pathname.includes("/dashboard/member")) {
    const token = request.cookies.get(MEMBER_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      const slug = pathname.match(/^\/gym\/([^/]+)/)?.[1] ?? "antigravity";
      return NextResponse.redirect(
        new URL(`/gym/${slug}/login?role=member`, request.url)
      );
    }
    return NextResponse.next();
  }

  // ── Trainer dashboard routes ─────────────────────────────────
  if (pathname.includes("/dashboard/trainer")) {
    // Supabase @supabase/ssr stores its session in a cookie named
    // `sb-<project-ref>-auth-token`. Presence check only (no network).
    const hasSupabaseAuth = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

    if (!hasSupabaseAuth) {
      const slug = pathname.match(/^\/gym\/([^/]+)/)?.[1] ?? "antigravity";
      return NextResponse.redirect(
        new URL(`/gym/${slug}/login?role=trainer`, request.url)
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Only run on dashboard routes — never on API routes, static assets, or public pages
  matcher: ["/gym/:slug/dashboard/:path*"],
};
