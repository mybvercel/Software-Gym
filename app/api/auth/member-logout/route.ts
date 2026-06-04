import { MEMBER_COOKIE } from "@/lib/session";

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Expire the cookie immediately
      "Set-Cookie": `${MEMBER_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`,
    },
  });
}
