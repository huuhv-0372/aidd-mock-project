const RIFF_HEADER_BYTES = 12; // "RIFF" + size (4) + "WEBP"
const CHUNK_HEADER_BYTES = 8; // FourCC (4) + size (4)
const VP8X_DATA_BYTES = 10;
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;
const DROPPED = new Set(["EXIF", "XMP ", "C2PA"]); // C2PA: provenance / creator assertions

const fourccAt = (bytes: Uint8Array, at: number) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);

/**
 * The pieces of a WebP without its EXIF, XMP and C2PA chunks. In an extended file (VP8X first) the EXIF and XMP flag bits
 * of VP8X are cleared and the RIFF size is rewritten to match; a simple VP8 / VP8L file has no metadata and goes on
 * as it is. Bytes after the RIFF size (an appended payload) are dropped. Every other chunk is taken byte for byte.
 * The pieces are subarrays of `bytes` apart from the 12-byte header and the 18-byte VP8X chunk when those had to
 * change; a Blob is built from the list without joining them.
 * Returns null when the file is not a well-formed RIFF/WebP chunk stream (RIFF size beyond the file, a chunk that
 * runs past the RIFF end, a VP8X of the wrong size, no chunk) so the caller refuses it.
 */
export function stripWebpMetadata(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>[] | null {
  if (bytes.length < RIFF_HEADER_BYTES || fourccAt(bytes, 0) !== "RIFF" || fourccAt(bytes, 8) !== "WEBP") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const total = 8 + view.getUint32(4, true);
  if (total > bytes.length) return null;

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let keptBytes = 4; // the "WEBP" tag counts towards the RIFF size
  let pos = RIFF_HEADER_BYTES;
  while (pos < total) {
    if (pos + CHUNK_HEADER_BYTES > total) return null;
    const size = view.getUint32(pos + 4, true);
    const dataEnd = pos + CHUNK_HEADER_BYTES + size;
    if (dataEnd > total) return null;
    const next = Math.min(dataEnd + (size & 1), total); // chunks are padded to an even length
    const fourcc = fourccAt(bytes, pos);

    if (fourcc === "VP8X" && pos === RIFF_HEADER_BYTES) {
      if (size !== VP8X_DATA_BYTES) return null;
      const header = bytes.slice(pos, next); // small copy: the flags are edited
      header[CHUNK_HEADER_BYTES] &= ~(VP8X_EXIF_FLAG | VP8X_XMP_FLAG);
      chunks.push(header);
      keptBytes += header.length;
    } else if (!DROPPED.has(fourcc)) {
      chunks.push(bytes.subarray(pos, next));
      keptBytes += next - pos;
    }
    pos = next;
  }
  if (chunks.length === 0) return null;

  if (keptBytes === total - 8) return [bytes.subarray(0, RIFF_HEADER_BYTES), ...chunks];
  const header = bytes.slice(0, RIFF_HEADER_BYTES);
  new DataView(header.buffer).setUint32(4, keptBytes, true);
  return [header, ...chunks];
}
