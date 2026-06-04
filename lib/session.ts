/**
 * lib/session.ts
 * Firma y verifica tokens con HMAC-SHA256 usando Web Crypto API.
 * Compatible con Edge Runtime (middleware) y Node.js (API routes).
 */

export interface MemberSession {
  id: string;
  name: string;
  gym_id: string;
  gym_slug: string;
  role: string;
  iat: number;
}

export const MEMBER_COOKIE  = "gymos_member_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";

/* ── Helpers ────────────────────────────────────────────── */

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/* ── Derive a deterministic member password ───────────────────
   Members never see or type this. It is derived from the server
   secret + gym + DNI so the login endpoint can re-derive it to
   sign the member into their Supabase Auth account (which enables
   per-user Row Level Security on all their data). ──────────────── */

export async function deriveMemberPassword(
  gymId: string,
  dni: string
): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`member:${gymId}:${dni}`)
  );
  // hex string, always ≥ 6 chars (Supabase minimum)
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* Email used for the member's Supabase Auth account.
   Gym-scoped so the same DNI can exist in different gyms. */
export function memberAuthEmail(gymId: string, dni: string): string {
  return `${gymId.replace(/-/g, "")}.${dni}@gymos.local`;
}

function toBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/* ── Sign ───────────────────────────────────────────────── */

export async function signSession(
  data: Omit<MemberSession, "iat">
): Promise<string> {
  const payload = btoa(
    JSON.stringify({ ...data, iat: Math.floor(Date.now() / 1000) })
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const key = await getKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return `${payload}.${toBase64url(sig)}`;
}

/* ── Verify ─────────────────────────────────────────────── */

export async function verifySession(
  token: string
): Promise<MemberSession | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;

    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);

    const key = await getKey();
    const sigBytes = fromBase64url(sig);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength) as ArrayBuffer,
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;

    const data = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as MemberSession;

    // Expire after 30 days
    if (Math.floor(Date.now() / 1000) - data.iat > COOKIE_MAX_AGE) return null;

    return data;
  } catch {
    return null;
  }
}
