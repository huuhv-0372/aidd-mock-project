"use server";

import { z } from "zod";
import { getKudoDetail } from "@/lib/kudos/get-kudo-detail";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import {
  inspectKudoImages,
  kudoImagePublicUrls,
  removeKudoImages,
  uploadKudoImages,
} from "@/lib/kudos/upload-kudo-images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOnSupabaseOrigin } from "@/lib/validation/kudos";
import {
  fieldErrorsFromIssues,
  fieldOfRpcError,
  KUDO_IMAGE_URL,
  updateKudoSchema,
  type KudoFieldErrors,
} from "@/lib/validation/write-kudo";

/** Assignable to UpdateKudoResult (components/kudos-compose/write-kudo-types.ts), the type the edit modal receives. */
export type UpdateKudoResult =
  | { ok: true; kudo: KudoRow }
  | { ok: false; error: "validation"; fields?: KudoFieldErrors }
  | { ok: false; error: "server" | "not_found" };

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const SERVER_ERROR = { ok: false, error: "server" } as const;
const NOT_FOUND = { ok: false, error: "not_found" } as const;
// What update_kudo answers: the URLs of the images the Kudo no longer holds.
const removedUrlsSchema = z.array(z.string());

/**
 * FormData fields (write-kudo-types.ts WriteKudoActions.updateKudo): kudoId, title, content (Markdown), hashtags
 * (repeated slug), anonymousName, keepImages (repeated URL, in order), images (repeated File, in order). Nothing else is
 * read: the recipient and the anonymous state of a Kudo cannot change.
 */
function readForm(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };
  return {
    kudoId: text("kudoId"),
    title: text("title"),
    content: text("content"),
    hashtags: formData.getAll("hashtags"),
    anonymousName: text("anonymousName"),
    keepImages: formData.getAll("keepImages"),
    images: formData.getAll("images"),
  };
}

/**
 * Deletes from Storage the images update_kudo dropped, after it committed. Best effort: a failure is logged and the
 * save stands. Only flat `kudo-images` objects on the project's Supabase origin are touched, never a URL the Kudo still holds, and the owner-only
 * Storage policy limits the delete to the caller's own objects.
 */
async function removeDroppedImages(client: ServerClient, removed: unknown, kept: string[]): Promise<void> {
  const urls = removedUrlsSchema.safeParse(removed);
  if (!urls.success) {
    console.error("[kudos] update_kudo returned an unexpected result", removed);
    return;
  }
  const paths = urls.data
    .filter((url) => !kept.includes(url) && isOnSupabaseOrigin(url))
    .flatMap((url) => KUDO_IMAGE_URL.exec(url)?.[1] ?? []);
  await removeKudoImages(client, paths);
}

/**
 * Saves an edit of a Kudo the caller sent (plans/261022-edit-kudo): verifies the session, validates the form, checks and
 * uploads the new images (shared with createKudo), then calls `update_kudo` (sender-only, checked again in SQL) with the
 * kept URLs then the new ones, in order. After the update the dropped images are deleted and the row is read back
 * through `kudo_detail` (the shape the board shows). The new uploads are removed only when the Kudo cannot reference
 * them: a failure before the RPC is sent, or an RPC error the database answered with a code. A missing Kudo and one of
 * another user are the same `not_found`. Failures are logged in full; only a generic code reaches the client.
 */
export async function updateKudo(formData: FormData): Promise<UpdateKudoResult> {
  let client: ServerClient | undefined;
  let uploaded: string[] = [];
  let rpcSent = false;
  try {
    const supabase = await createSupabaseServerClient();
    client = supabase;
    const { data: claims, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !claims?.claims.sub) {
      console.error("[kudos] update without a verified session", claimsError);
      return SERVER_ERROR;
    }

    const parsed = updateKudoSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      console.error("[kudos] update rejected invalid input", parsed.error.issues.map((issue) => issue.path.join(".")));
      return { ok: false, error: "validation", fields: fieldErrorsFromIssues(parsed.error.issues) };
    }
    const input = parsed.data;
    // The schema checks the Storage path shape; only the project's own Supabase origin is a kept image.
    if (!input.keepImages.every((url) => isOnSupabaseOrigin(url))) {
      console.error("[kudos] update rejected a kept image outside the Supabase origin");
      return { ok: false, error: "validation", fields: { images: "invalid" } };
    }

    const inspected = await inspectKudoImages(input.images);
    if (!inspected.ok) {
      console.error("[kudos] update rejected an image", inspected.reason);
      return { ok: false, error: "validation", fields: { images: inspected.reason } };
    }
    const stored = await uploadKudoImages(supabase, inspected.images);
    if (!stored) return SERVER_ERROR;
    uploaded = stored;
    const imageUrls = [...input.keepImages, ...kudoImagePublicUrls(supabase, stored)];

    // From here the update may commit even if we never hear back, so the new images only go on a definitive "no".
    rpcSent = true;
    const { data, error } = await supabase.rpc("update_kudo", {
      p_id: input.kudoId,
      p_title: input.title,
      p_content: input.content,
      p_hashtag_slugs: input.hashtags,
      p_image_urls: imageUrls,
      p_anonymous_name: input.anonymousName,
    });
    if (error) {
      console.error("[kudos] update_kudo failed", error);
      // Only a coded answer (SQLSTATE / PGRST) proves the database refused the update; without a code it may have committed.
      if (error.code) await removeKudoImages(supabase, uploaded);
      if (error.code === "22023" && error.message === "not_found") return NOT_FOUND;
      const field = fieldOfRpcError(error);
      return field ? { ok: false, error: "validation", fields: { [field]: "invalid" } } : SERVER_ERROR;
    }

    await removeDroppedImages(supabase, data, imageUrls);
    const detail = await getKudoDetail(input.kudoId, supabase);
    if (detail.status !== "ok") {
      // Saved, but the row cannot be shown: the client keeps the dialog open and a retry re-sends the same edit.
      console.error("[kudos] updated Kudo could not be read back", detail.status);
      return SERVER_ERROR;
    }
    return { ok: true, kudo: detail.kudo };
  } catch (err) {
    console.error("[kudos] update unexpected failure", err);
    // Before the RPC was sent no Kudo can reference the uploads, so they go. After it, the Kudo may hold them: keep them.
    if (client && !rpcSent) await removeKudoImages(client, uploaded);
    return SERVER_ERROR;
  }
}
