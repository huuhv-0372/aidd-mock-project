import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Per-request Supabase client for Server Components, Server Actions and Route Handlers.
 * Never share across requests. Throws (generic message) when Supabase env is missing/invalid.
 */
export async function createSupabaseServerClient() {
  // cookies() first: during `next build` it marks the route dynamic and stops the prerender before the env
  // is read, so a build without Supabase env (Cloudflare Workers Builds) does not fail. The env is runtime-only.
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
