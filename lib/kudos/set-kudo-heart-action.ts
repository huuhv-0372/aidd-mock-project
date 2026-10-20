"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { kudoHeartStateSchema, setKudoHeartInputSchema } from "@/lib/validation/kudos";

export type SetKudoHeartResult = { ok: true; liked: boolean; heartCount: number } | { ok: false; error: "own" | "generic" };

const GENERIC = { ok: false, error: "generic" } as const;

/**
 * Sets (not toggles) the viewer's heart on a Kudo through `set_kudo_heart`, which checks the session and account rule,
 * refuses the viewer's own Kudo and decides x1/x2 itself. Input is untrusted, so it is validated first. The answer is
 * the database's state and count, never the request's. Failures are logged in full; only "own" (22023 own_kudo) or
 * "generic" reaches the client.
 */
export async function setKudoHeart(input: unknown): Promise<SetKudoHeartResult> {
  const parsed = setKudoHeartInputSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[kudos] heart rejected invalid input", parsed.error.issues.map((issue) => issue.path.join(".")));
    return GENERIC;
  }

  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.rpc("set_kudo_heart", {
      p_kudo_id: parsed.data.kudoId,
      p_liked: parsed.data.liked,
    });
    if (error) {
      console.error("[kudos] set_kudo_heart failed", error);
      return error.code === "22023" && error.message === "own_kudo" ? { ok: false, error: "own" } : GENERIC;
    }
    const row = kudoHeartStateSchema.safeParse(Array.isArray(data) ? data[0] : undefined);
    if (!row.success) {
      console.error("[kudos] set_kudo_heart returned an unexpected result", data);
      return GENERIC;
    }
    return { ok: true, liked: row.data.liked, heartCount: row.data.heart_count };
  } catch (err) {
    console.error("[kudos] heart unexpected failure", err);
    return GENERIC;
  }
}
