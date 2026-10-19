"use server";

import { inspectKudoImage, KUDO_IMAGE_BUCKET, type InspectedKudoImage } from "@/lib/kudos/kudo-image-file";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrorsFromIssues,
  writeKudoSchema,
  type KudoField,
  type KudoFieldErrors,
} from "@/lib/validation/write-kudo";

export type CreateKudoResult =
  | { ok: true; id: string }
  | { ok: false; error: "validation"; fields?: KudoFieldErrors }
  | { ok: false; error: "server" };

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type ReadyImage = Extract<InspectedKudoImage, { ok: true }>;

const SERVER_ERROR = { ok: false, error: "server" } as const;
// `create_kudo` raises errcode 22023 with one of these short codes as the message (supabase phase 02).
const RPC_FIELD_BY_CODE: Record<string, KudoField> = {
  invalid_recipient: "recipient",
  invalid_title: "title",
  invalid_content: "content",
  invalid_hashtags: "hashtags",
  invalid_images: "images",
  invalid_alias: "anonymousName",
};

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

async function removeUploaded(client: ServerClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await client.storage.from(KUDO_IMAGE_BUCKET).remove(paths);
    if (error) console.error("[kudos] cleanup of uploaded images failed", error);
  } catch (err) {
    console.error("[kudos] cleanup of uploaded images failed", err);
  }
}

/**
 * Uploads every image as a flat `{uuid}.{ext}` object; on any failure removes the ones already stored and returns null.
 * The name must never carry the sender: the public URL of an anonymous Kudo's image would reveal who wrote it.
 * Ownership is `storage.objects.owner_id`, which Storage fills from the caller's JWT and `create_kudo` checks.
 */
async function uploadImages(client: ServerClient, images: ReadyImage[]): Promise<string[] | null> {
  const storage = client.storage.from(KUDO_IMAGE_BUCKET);
  const paths = images.map((image) => `${crypto.randomUUID()}.${image.ext}`);
  const results = await Promise.allSettled(
    images.map(async (image, index) => {
      // The multipart part type comes from the Blob (set to the sniffed type); contentType states the same for any other body.
      const { error } = await storage.upload(paths[index], image.body, { contentType: image.mime, upsert: false });
      if (error) throw error;
    }),
  );
  const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (!failure) return paths;
  console.error("[kudos] image upload failed", failure.reason);
  await removeUploaded(client, paths.filter((_, index) => results[index].status === "fulfilled"));
  return null;
}

/**
 * Sends a Kudo: validates the form, verifies the session, checks the real image bytes one image at a time (personal
 * metadata stripped), uploads the images as flat identity-free objects, then calls `create_kudo` (sender = session
 * user, enforced again in SQL). No image byte is read before the session is verified; nothing is uploaded and no RPC
 * runs unless every field and image passed. A failed RPC removes the images just uploaded. Failures are logged in
 * full and only a generic code reaches the client.
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
  try {
    const supabase = await createSupabaseServerClient();
    client = supabase;
    const { data: claims, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !claims?.claims.sub) {
      console.error("[kudos] create without a verified session", claimsError);
      return SERVER_ERROR;
    }

    // One image at a time: each is read whole and cleaned, so at most one full file is held while inspecting.
    const images: ReadyImage[] = [];
    for (const file of input.images) {
      const inspected = await inspectKudoImage(file);
      if (!inspected.ok) {
        console.error("[kudos] create rejected an image", inspected.reason);
        return { ok: false, error: "validation", fields: { images: inspected.reason } };
      }
      images.push(inspected);
    }

    const stored = await uploadImages(supabase, images);
    if (!stored) return SERVER_ERROR;
    uploaded = stored;

    const { data, error } = await supabase.rpc("create_kudo", {
      p_recipient_id: input.recipientId,
      p_title: input.title,
      p_content: input.content,
      p_hashtag_slugs: input.hashtags,
      p_image_urls: stored.map((path) => supabase.storage.from(KUDO_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl),
      p_is_anonymous: input.isAnonymous,
      p_anonymous_name: input.anonymousName,
    });
    if (!error && typeof data !== "string") {
      // The Kudo may exist, so its images must stay: only a rejected RPC rolls the uploads back.
      console.error("[kudos] create_kudo returned an unexpected result", data);
      return SERVER_ERROR;
    }
    if (error) {
      console.error("[kudos] create_kudo failed", error);
      await removeUploaded(supabase, uploaded);
      const field = error?.code === "22023" ? RPC_FIELD_BY_CODE[error.message] : undefined;
      return field
        ? { ok: false, error: "validation", fields: { [field]: "invalid" } }
        : SERVER_ERROR;
    }
    return { ok: true, id: data as string };
  } catch (err) {
    console.error("[kudos] create unexpected failure", err);
    // `client` is unset when it could not even be created, in which case nothing was uploaded.
    if (client) await removeUploaded(client, uploaded);
    return SERVER_ERROR;
  }
}
