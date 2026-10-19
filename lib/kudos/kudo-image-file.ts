import { stripJpegMetadata } from "@/lib/kudos/strip-jpeg-metadata";
import { stripPngMetadata } from "@/lib/kudos/strip-png-metadata";
import { stripWebpMetadata } from "@/lib/kudos/strip-webp-metadata";

/** Limits and server-side checks for Kudo attachments. No zod / next imports: safe to read from client code too. */
export const KUDO_IMAGE_MAX_COUNT = 5;
export const KUDO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const KUDO_IMAGE_BUCKET = "kudo-images";

export type KudoImageMime = "image/jpeg" | "image/png" | "image/webp";
export type KudoImageExt = "jpg" | "png" | "webp";
export type KudoImageKind = { mime: KudoImageMime; ext: KudoImageExt };

const KINDS: Record<KudoImageMime, KudoImageKind> = {
  "image/jpeg": { mime: "image/jpeg", ext: "jpg" },
  "image/png": { mime: "image/png", ext: "png" },
  "image/webp": { mime: "image/webp", ext: "webp" },
};

export const KUDO_IMAGE_MIME_TYPES = Object.keys(KINDS) as KudoImageMime[];

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b);

/** Type from the leading bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`); the file name and client MIME are never consulted. */
export function sniffImageKind(bytes: Uint8Array): KudoImageKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return KINDS["image/jpeg"];
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return KINDS["image/png"];
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return KINDS["image/webp"];
  }
  return null;
}

const SNIFF_BYTES = 12; // enough for every signature above (WebP needs the first 12)

/** Per format: the pieces of the file without personal metadata, or null when its structure is not well-formed. */
const STRIPPERS: Record<KudoImageMime, (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>[] | null> = {
  "image/jpeg": stripJpegMetadata,
  "image/png": stripPngMetadata,
  "image/webp": stripWebpMetadata,
};

export type InspectedKudoImage =
  | { ok: true; body: Blob; mime: KudoImageMime; ext: KudoImageExt }
  | { ok: false; reason: "format" | "size" };

/**
 * Accepts an upload only when the declared MIME is on the allow-list, the size is within the cap and the real bytes
 * are an image of an allowed type; the sniffed type, not the declared one, decides ext and the Blob's type (supabase-js
 * takes the multipart type from the Blob). The first 12 bytes decide the type; then the file is read whole (one image
 * at a time: callers loop, they do not fan out) and its metadata is stripped (Exif / GPS / text chunks / trailers, see
 * the strip-* modules). The Blob is built from the kept pieces, never from one more joined buffer. A file whose
 * structure cannot be parsed is refused as a format error.
 */
export async function inspectKudoImage(file: File): Promise<InspectedKudoImage> {
  if (file.size > KUDO_IMAGE_MAX_BYTES) return { ok: false, reason: "size" };
  if (!Object.hasOwn(KINDS, file.type)) return { ok: false, reason: "format" };
  const kind = sniffImageKind(new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()));
  if (!kind) return { ok: false, reason: "format" };
  const parts = STRIPPERS[kind.mime](new Uint8Array(await file.arrayBuffer()));
  if (!parts) return { ok: false, reason: "format" };
  return { ok: true, body: new Blob(parts, { type: kind.mime }), ...kind };
}
