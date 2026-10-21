import { z } from "zod";
import type { ServerClient } from "@/lib/kudos/get-kudos-board-data";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import { kudoIdSchema, kudoRowSchema } from "@/lib/validation/kudos";

export type KudoDetailResult = { status: "ok"; kudo: KudoRow } | { status: "not_found" } | { status: "error" };

// `kudo_detail` answers 0 rows (unknown id, or a caller the account rule refuses) or exactly 1.
const detailRowsSchema = z.array(kudoRowSchema).max(1);

/**
 * One Kudo for the View Kudo page through `kudo_detail`, which checks the account rule and hides the sender of an
 * anonymous Kudo. The id comes from the URL, so a malformed one is `not_found` without a query; no row is
 * `not_found` too (the page answers 404 either way). Any failure is logged in full server-side and only `error`
 * reaches the page. Never throws. `client` is injectable so tests need no `next/headers`.
 */
export async function getKudoDetail(id: string, client?: ServerClient): Promise<KudoDetailResult> {
  const parsedId = kudoIdSchema.safeParse(id);
  if (!parsedId.success) return { status: "not_found" };
  try {
    const supabase = client ?? (await createDefaultClient());
    const { data, error } = await supabase.rpc("kudo_detail", { p_id: parsedId.data });
    if (error) {
      console.error("[kudos] kudo_detail failed", error);
      return { status: "error" };
    }
    const rows = detailRowsSchema.safeParse(data);
    if (!rows.success) {
      console.error("[kudos] kudo_detail returned malformed data", rows.error);
      return { status: "error" };
    }
    const [kudo] = rows.data;
    return kudo ? { status: "ok", kudo } : { status: "not_found" };
  } catch (err) {
    console.error("[kudos] kudo_detail unexpected failure", err);
    return { status: "error" };
  }
}

/** Lazy import keeps `next/headers` out of the module graph until a real request needs it. */
async function createDefaultClient(): Promise<ServerClient> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  return createSupabaseServerClient();
}
