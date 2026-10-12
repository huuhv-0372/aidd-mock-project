import { z } from "zod";

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
