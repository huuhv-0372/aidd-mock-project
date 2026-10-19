const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
const TIFF_MAGIC = 42;
const TAG_ORIENTATION = 0x0112;
const TYPE_SHORT = 3;
const IFD_ENTRY_BYTES = 12;
// FF E1, length, "Exif\0\0", TIFF header (8), IFD0: entry count (2) + one entry (12) + next-IFD offset (4).
const SEGMENT_BYTES = 2 + 2 + EXIF_HEADER.length + 8 + 2 + IFD_ENTRY_BYTES + 4;

/**
 * Reads the Orientation tag (IFD0, 0x0112, SHORT) of an APP1 payload (the bytes after the segment's length field) and
 * returns a complete replacement APP1 segment that carries that one tag and nothing else: same byte order, no GPS /
 * Make / Model / Artist / thumbnail. Returns null when the payload is not an Exif TIFF, cannot be parsed, or the
 * orientation is absent, 1 (upright, nothing to preserve) or outside 2..8, so the caller then drops the segment.
 * A bad Exif body is never an error: browsers apply Orientation to display a photo upright, and everything else in
 * Exif is private.
 */
export function orientationOnlyExifSegment(payload: Uint8Array): Uint8Array<ArrayBuffer> | null {
  if (payload.length < EXIF_HEADER.length + 8 || !EXIF_HEADER.every((byte, i) => payload[i] === byte)) return null;
  const tiff = payload.subarray(EXIF_HEADER.length);
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const byteOrder = view.getUint16(0, false);
  if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return null; // "II" little-endian, "MM" big-endian
  const little = byteOrder === 0x4949;
  if (view.getUint16(2, little) !== TIFF_MAGIC) return null;

  const ifd = view.getUint32(4, little);
  if (ifd + 2 > tiff.length) return null;
  const count = view.getUint16(ifd, little);
  if (ifd + 2 + count * IFD_ENTRY_BYTES > tiff.length) return null; // the entry table must fit, or the Exif is corrupt

  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * IFD_ENTRY_BYTES;
    if (view.getUint16(entry, little) !== TAG_ORIENTATION) continue;
    if (view.getUint16(entry + 2, little) !== TYPE_SHORT || view.getUint32(entry + 4, little) !== 1) return null;
    const orientation = view.getUint16(entry + 8, little); // a SHORT sits in the first 2 bytes of the value field
    return orientation >= 2 && orientation <= 8 ? orientationSegment(orientation, little) : null;
  }
  return null;
}

function orientationSegment(orientation: number, little: boolean): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(SEGMENT_BYTES);
  const view = new DataView(out.buffer);
  out.set([0xff, 0xe1], 0);
  view.setUint16(2, SEGMENT_BYTES - 2, false); // JPEG segment lengths are always big-endian
  out.set(EXIF_HEADER, 4);
  const tiff = 4 + EXIF_HEADER.length;
  view.setUint16(tiff, little ? 0x4949 : 0x4d4d, false);
  view.setUint16(tiff + 2, TIFF_MAGIC, little);
  view.setUint32(tiff + 4, 8, little); // IFD0 follows the header directly
  view.setUint16(tiff + 8, 1, little); // exactly one entry
  view.setUint16(tiff + 10, TAG_ORIENTATION, little);
  view.setUint16(tiff + 12, TYPE_SHORT, little);
  view.setUint32(tiff + 14, 1, little);
  view.setUint16(tiff + 18, orientation, little); // the other 2 value bytes and the next-IFD offset stay 0
  return out;
}
