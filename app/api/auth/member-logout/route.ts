import { NextRequest, NextResponse } from "next/server";
import { MEMBER_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true });

  // Clear the HMAC member cookie
  res.cookies.set(MEMBER_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });

  // Clear any Supabase auth cookies (sb-<ref>-auth-token[.n])
  request.cookies.getAll().forEach((c) => {
    if (c.name.startsWith("sb-") && c.name.includes("-auth-token")) {
      res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
    }
  });

  return res;
}
