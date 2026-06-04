import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Created lazily (inside request handlers)
 * so the build never evaluates it without env vars present.
 * NEVER import this into client components — service role bypasses RLS.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
