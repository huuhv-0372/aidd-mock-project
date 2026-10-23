"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  inspectKudoImages,
  kudoImagePublicUrls,
  removeKudoImages,
  uploadKudoImages,
} from "@/lib/kudos/upload-kudo-images";
import { fieldErrorsFromIssues, fieldOfRpcError, writeKudoSchema, type KudoFieldErrors } from "@/lib/validation/write-kudo";

export type CreateKudoResult =
  | { ok: true; id: string }
  | { ok: false; error: "validation"; fields?: KudoFieldErrors }
  | { ok: false; error: "server" };

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const SERVER_ERROR = { ok: false, error: "server" } as const;

/** FormData fields: recipientId, title, content (Markdown), hashtags (repeated slug), isAnonymous ("true"), anonymousName, images (repeated File). */
function readForm(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };
  return {
    recipientId: text("recipientId"),
    title: text("title"),
    content: text("content"),
    hashtags: formData.getAll("hashtags"),
    isAnonymous: text("isAnonymous") === "true",
    anonymousName: text("anonymousName"),
    images: formData.getAll("images"),
  };
}

/**
 * Sends a Kudo: validates the form, verifies the session, checks the real image bytes one image at a time (personal
 * metadata stripped), uploads the images as flat identity-free objects, then calls `create_kudo` (sender = session
 * user, enforced again in SQL). No image byte is read before the session is verified; nothing is uploaded and no RPC
 * runs unless every field and image passed. The images just uploaded are removed only when the Kudo cannot exist: a
 * failure before the RPC is sent, or an RPC error the database answered with a code. Failures are logged in full and
 * only a generic code reaches the client.
 */
export async function createKudo(formData: FormData): Promise<CreateKudoResult> {
  const parsed = writeKudoSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    console.error("[kudos] create rejected invalid input", parsed.error.issues.map((issue) => issue.path.join(".")));
    return { ok: false, error: "validation", fields: fieldErrorsFromIssues(parsed.error.issues) };
  }
  const input = parsed.data;

  let client: ServerClient | undefined;
  let uploaded: string[] = [];
  let rpcSent = false;
  try {
    const supabase = await createSupabaseServerClient();
    client = supabase;
    const { data: claims, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !claims?.claims.sub) {
      console.error("[kudos] create without a verified session", claimsError);
      return SERVER_ERROR;
    }

    const inspected = await inspectKudoImages(input.images);
    if (!inspected.ok) {
      console.error("[kudos] create rejected an image", inspected.reason);
      return { ok: false, error: "validation", fields: { images: inspected.reason } };
    }

    const stored = await uploadKudoImages(supabase, inspected.images);
    if (!stored) return SERVER_ERROR;
    uploaded = stored;
    const imageUrls = kudoImagePublicUrls(supabase, stored);

    // From here the transaction may commit even if we never hear back, so the images can only go on a definitive "no".
    rpcSent = true;
    const { data, error } = await supabase.rpc("create_kudo", {
      p_recipient_id: input.recipientId,
      p_title: input.title,
      p_content: input.content,
      p_hashtag_slugs: input.hashtags,
      p_image_urls: imageUrls,
      p_is_anonymous: input.isAnonymous,
      p_anonymous_name: input.anonymousName,
    });
    if (!error && typeof data !== "string") {
      // The Kudo may exist, so its images must stay.
      console.error("[kudos] create_kudo returned an unexpected result", data);
      return SERVER_ERROR;
    }
    if (error) {
      console.error("[kudos] create_kudo failed", error);
      // Only a coded answer (SQLSTATE / PGRST) proves the database refused the Kudo. supabase-js reports a network
      // failure or timeout as an error without a code: the outcome is unknown, so the images stay.
      if (error.code) await removeKudoImages(supabase, uploaded);
      const field = fieldOfRpcError(error);
      return field ? { ok: false, error: "validation", fields: { [field]: "invalid" } } : SERVER_ERROR;
    }
    return { ok: true, id: data as string };
  } catch (err) {
    console.error("[kudos] create unexpected failure", err);
    // Before the RPC was sent no Kudo can reference the uploads, so they go. After it, the Kudo may exist: keep them.
    // (`client` is unset when it could not even be created, in which case nothing was uploaded.)
    if (client && !rpcSent) await removeKudoImages(client, uploaded);
    return SERVER_ERROR;
  }
}
