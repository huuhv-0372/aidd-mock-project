import { z } from "zod";
import type { LoadMoreProfileKudosInput, ProfileKudosDirection } from "@/lib/profiles/profile-types";
import { kudoFeedCursorSchema } from "@/lib/validation/kudos";

/** Shape of a `public.profiles` row. Kept in DB snake_case (YAGNI: no mapping layer). */
export const profileSchema = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  department: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;

/** Comma-separated column list for `.select()`, derived from the schema to avoid drift. */
export const PROFILE_COLUMNS = profileSchema.keyof().options.join(", ");

/**
 * A profile id from the URL (`/profile/{id}`). Postgres `uuid` accepts any 8-4-4-4-12 hex (seed ids are not RFC 4122),
 * so `z.guid()`, not `z.uuid()`. Checked before any query: a malformed id is a 404 with no round trip.
 */
export const profileIdSchema = z.guid();

export const profileKudosDirectionSchema = z.enum(["received", "sent"]) satisfies z.ZodType<ProfileKudosDirection>;

/**
 * Untrusted input of the profile "load more" Server Action. `sent` is accepted for any profile here: the
 * `kudos_profile_feed` RPC itself answers 0 rows unless the profile is the caller's own.
 */
export const loadMoreProfileKudosInputSchema = z
  .object({
    profileId: profileIdSchema,
    direction: profileKudosDirectionSchema,
    cursor: kudoFeedCursorSchema.nullable(),
  })
  .strict() satisfies z.ZodType<LoadMoreProfileKudosInput>;
