"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashtagOptionSchema, type HashtagOption } from "@/lib/validation/write-kudo";

export type HashtagOptionsResult = { ok: true; items: HashtagOption[] } | { ok: false };

const optionsSchema = z.array(hashtagOptionSchema);

/** The fixed hashtag catalog (catalog order) for the "+ Hashtag" dropdown. Failures are logged and surfaced as `{ ok: false }`. */
export async function getHashtagOptions(): Promise<HashtagOptionsResult> {
  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.from("hashtags").select("slug, name_vi, name_en").order("sort_order");
    if (error) {
      console.error("[kudos] hashtag options query failed", error);
      return { ok: false };
    }
    const items = optionsSchema.safeParse(data);
    if (!items.success) {
      console.error("[kudos] hashtag options malformed", items.error);
      return { ok: false };
    }
    return { ok: true, items: items.data };
  } catch (err) {
    console.error("[kudos] hashtag options unexpected failure", err);
    return { ok: false };
  }
}
