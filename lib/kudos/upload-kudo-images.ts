import { inspectKudoImage, KUDO_IMAGE_BUCKET, type InspectedKudoImage } from "@/lib/kudos/kudo-image-file";
import type { ServerClient } from "@/lib/kudos/get-kudos-board-data";

/*
 * Kudo image storage shared by createKudo and updateKudo. Server-only by use: imported only by "use server" modules,
 * and deliberately NOT a "use server" module itself (its exports would become callable actions).
 */

export type ReadyImage = Extract<InspectedKudoImage, { ok: true }>;
export type InspectedKudoImages = { ok: true; images: ReadyImage[] } | { ok: false; reason: "format" | "size" };

/**
 * Checks the real bytes of each file and strips personal metadata (inspectKudoImage), one image at a time: each is
 * read whole and cleaned, so at most one full file is held while inspecting. Stops at the first refused file.
 */
export async function inspectKudoImages(files: File[]): Promise<InspectedKudoImages> {
  const images: ReadyImage[] = [];
  for (const file of files) {
    const inspected = await inspectKudoImage(file);
    if (!inspected.ok) return { ok: false, reason: inspected.reason };
    images.push(inspected);
  }
  return { ok: true, images };
}

/** Best effort: removes these objects as the caller (owner-only Storage policies); a failure is logged, never thrown. */
export async function removeKudoImages(client: ServerClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await client.storage.from(KUDO_IMAGE_BUCKET).remove(paths);
    if (error) console.error("[kudos] removing kudo images failed", error);
  } catch (err) {
    console.error("[kudos] removing kudo images failed", err);
  }
}

/**
 * Uploads every image as a flat `{uuid}.{ext}` object; on any failure removes the ones already stored and returns null.
 * The name must never carry the sender: the public URL of an anonymous Kudo's image would reveal who wrote it.
 * Ownership is `storage.objects.owner_id`, which Storage fills from the caller's JWT and the write RPCs check.
 */
export async function uploadKudoImages(client: ServerClient, images: ReadyImage[]): Promise<string[] | null> {
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
  await removeKudoImages(client, paths.filter((_, index) => results[index].status === "fulfilled"));
  return null;
}

/** The public URL of each uploaded object, in order (what the write RPCs store). */
export function kudoImagePublicUrls(client: ServerClient, paths: string[]): string[] {
  return paths.map((path) => client.storage.from(KUDO_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
}
