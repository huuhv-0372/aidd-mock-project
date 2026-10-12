import { z } from "zod";

export const SUPABASE_ENV_ERROR = "Supabase environment is missing or invalid";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});

export type SupabaseEnv = { url: string; publishableKey: string };

/**
 * Supabase URL + publishable key (public by design), validated at call time.
 * Reads through a `source` object rather than literal `process.env.NEXT_PUBLIC_*` so Next does not
 * inline build-time values: the build needs no env, and Workers/E2E servers supply it at runtime.
 * Throws a generic message; the offending value is never echoed.
 */
export function getSupabaseEnv(
  source: Record<string, string | undefined> = process.env,
): SupabaseEnv {
  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) throw new Error(SUPABASE_ENV_ERROR);
  return {
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
