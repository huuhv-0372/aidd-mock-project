const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const CHUNK_OVERHEAD = 12; // length (4) + type (4) + CRC (4)
const MAX_CHUNK_LENGTH = 0x7fffffff; // the PNG spec's ceiling for the length field
/** Ancillary chunks that carry personal data: Exif, text (author, comment, software), last-modified time, C2PA provenance. */
const DROPPED = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME", "caBX"]);

const typeAt = (bytes: Uint8Array, at: number) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);

/**
 * The pieces of a PNG without its eXIf, tEXt, iTXt, zTXt, tIME and caBX (C2PA) chunks, cut right after IEND (a trailing second
 * image or hidden payload is dropped). Every other chunk is taken byte for byte, so its CRC stays valid. The pieces
 * are subarrays of `bytes`; a Blob is built from the list without joining them.
 * Returns null when the file is not a well-formed PNG chunk stream (bad signature, IHDR not first, a chunk that runs
 * past the end of the file, no IEND) so the caller refuses it.
 */
export function stripPngMetadata(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>[] | null {
  if (bytes.length < SIGNATURE.length || !SIGNATURE.every((byte, i) => bytes[i] === byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let copyFrom = 0; // start of the run of bytes not yet taken
  let pos = SIGNATURE.length;

  for (let first = true; pos + CHUNK_OVERHEAD <= bytes.length; first = false) {
    const length = view.getUint32(pos, false);
    const type = typeAt(bytes, pos + 4);
    const end = pos + CHUNK_OVERHEAD + length;
    if (length > MAX_CHUNK_LENGTH || end > bytes.length) return null;
    if (first && (type !== "IHDR" || length !== 13)) return null;

    if (type === "IEND") {
      parts.push(bytes.subarray(copyFrom, end));
      return parts;
    }
    if (DROPPED.has(type)) {
      parts.push(bytes.subarray(copyFrom, pos));
      copyFrom = end;
    }
    pos = end;
  }
  return null; // ran out of bytes without a complete IEND chunk
}
