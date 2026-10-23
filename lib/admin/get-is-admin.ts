import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Whether the signed-in caller is an admin, asked of the database every time (RPC `is_admin`: account rule + the
 * caller's own profiles.role), never read from the token, so a demotion applies on the next request. Never throws:
 * any failure is logged server-side and answers false (fail closed).
 */
export async function getIsAdmin(client?: ServerClient): Promise<boolean> {
  try {
    const supabase = client ?? (await createSupabaseServerClient());
    const { data, error } = await supabase.rpc("is_admin");
    if (error) {
      console.error("[admin] is_admin failed", error);
      return false;
    }
    if (typeof data !== "boolean") {
      console.error("[admin] is_admin returned an unexpected result", typeof data);
      return false;
    }
    return data;
  } catch (err) {
    console.error("[admin] is_admin unexpected failure", err);
    return false;
  }
}
