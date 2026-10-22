import { z } from "zod";
import { readBlock, type KudosFeedPage, type ServerClient } from "@/lib/kudos/get-kudos-board-data";
import type { KudoFeedCursor } from "@/lib/kudos/kudo-types";
import type { ProfileKudosDirection } from "@/lib/profiles/profile-types";
import { KUDOS_PAGE_SIZE, kudoRowSchema } from "@/lib/validation/kudos";

const rowsSchema = z.array(kudoRowSchema);

/**
 * One keyset page of `kudos_profile_feed` (newest first), shared by the page loader (first page) and the load-more
 * action. The RPC owns every access rule: `sent` answers rows only for the caller's own profile. `null` on any failure
 * (logged server-side); `nextCursor` is `null` when the page was not full, like the board's feed.
 */
export async function fetchProfileKudos(
  client: ServerClient,
  profileId: string,
  direction: ProfileKudosDirection,
  cursor: KudoFeedCursor | null,
  limit: number = KUDOS_PAGE_SIZE,
): Promise<KudosFeedPage | null> {
  const items = await readBlock(
    "kudos_profile_feed",
    () => client.rpc("kudos_profile_feed", {
      p_profile: profileId,
      p_direction: direction,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: limit,
    }),
    (data) => rowsSchema.safeParse(data),
  );
  if (items === null) return null;
  const last = items[items.length - 1];
  const nextCursor = items.length >= limit && last ? { created_at: last.created_at, id: last.id } : null;
  return { items, nextCursor };
}
