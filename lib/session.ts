/**
 * lib/session.ts
 * Firma y verifica tokens de sesión con HMAC-SHA256.
 * Solo corre en el servidor — nunca se expone al cliente.
 */

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SESSION_SECRET;

if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET is not set — set it in .env.local");
}

export interface MemberSession {
  id: string;
  name: string;
  gym_id: string;
  gym_slug: string;
  role: string;
  iat: number; // issued at (unix timestamp)
}

/* ── Sign ─────────────────────────────────────────────────── */

export function signSession(data: Omit<MemberSession, "iat">): string {
  const payload = Buffer.from(
    JSON.stringify({ ...data, iat: Math.floor(Date.now() / 1000) })
  ).toString("base64url");

  const sig = createHmac("sha256", SECRET ?? "dev-secret")
    .update(payload)
    .digest("base64url");

  return `${payload}.${sig}`;
}

/* ── Verify ───────────────────────────────────────────────── */

export function verifySession(token: string): MemberSession | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;

    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);

    const expected = createHmac("sha256", SECRET ?? "dev-secret")
      .update(payload)
      .digest("base64url");

    // timing-safe comparison prevents timing attacks
    const sigBuf = Buffer.from(sig,      "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as MemberSession;

    // Expire after 30 days
    const MAX_AGE = 30 * 24 * 60 * 60;
    if (Math.floor(Date.now() / 1000) - data.iat > MAX_AGE) return null;

    return data;
  } catch {
    return null;
  }
}

/* ── Cookie helpers ───────────────────────────────────────── */

export const MEMBER_COOKIE = "gymos_member_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días en segundos

export function memberCookieOptions(maxAge = COOKIE_MAX_AGE) {
  return [
    `${MEMBER_COOKIE}=`,   // value filled by caller
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ].filter(Boolean).join("; ");
}
