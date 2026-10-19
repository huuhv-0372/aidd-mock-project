import { orientationOnlyExifSegment } from "@/lib/kudos/exif-orientation";

const MARKER_PREFIX = 0xff;
const SOS = 0xda; // start of scan: entropy-coded image data follows its header
const EOI = 0xd9; // end of image
const APP1 = 0xe1; // Exif (GPS position, device, time) and XMP
const APP11 = 0xeb; // JUMBF / C2PA provenance
const APP13 = 0xed; // Photoshop / IPTC (caption, author, location)
const COM = 0xfe; // free-text comment
const DROPPED = new Set([APP1, APP11, APP13, COM]);

/** Markers with no length field: TEM, RSTn, SOI. */
const isStandalone = (marker: number) => marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8);

/**
 * From `from` inside entropy-coded data, the index of the 0xFF that starts the next real marker, or -1 when the
 * data runs out first. FF 00 (stuffed byte), FF D0..D7 (restart) belong to the data; FF FF is fill before a marker.
 */
function nextMarkerInScan(bytes: Uint8Array, from: number): number {
  let i = from;
  while (i < bytes.length) {
    if (bytes[i] !== MARKER_PREFIX) {
      i++;
      continue;
    }
    const next = bytes[i + 1];
    if (next === undefined) return -1;
    if (next === MARKER_PREFIX) i++;
    else if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) i += 2;
    else return i;
  }
  return -1;
}

/**
 * The pieces of a JPEG without its APP1 (Exif / XMP), APP11 (JUMBF), APP13 (IPTC) and COM segments, so a photo's GPS
 * position, device details and comments never reach a public bucket, and cut right after the first end-of-image so
 * a second image (MPF) or a trailer (motion-photo video, appended payload) cannot ride along. The one Exif thing kept
 * is the Orientation tag, as a minimal APP1 with that tag alone (see exif-orientation.ts): without it a phone's
 * portrait photo shows sideways. Pieces are subarrays of `bytes` (plus that one segment); a Blob is built from the
 * list, so the cleaned file is never joined into one more buffer.
 * Walks the marker segments from SOI to EOI, skipping the entropy-coded data of each scan; segments between scans are
 * handled like those in the header. Returns null when the structure is not well-formed (a length past the end of the
 * file, a length under 2, a byte that is not a marker, no scan, no end-of-image) so the caller refuses the file
 * instead of storing something it could not inspect. A corrupt Exif body inside a well-formed segment is not such an
 * error: that APP1 is just dropped.
 */
export function stripJpegMetadata(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>[] | null {
  if (bytes.length < 4 || bytes[0] !== MARKER_PREFIX || bytes[1] !== 0xd8) return null;
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let orientation: Uint8Array<ArrayBuffer> | null = null; // the one Orientation-only APP1 that replaces the removed Exif
  let copyFrom = 0; // start of the run of bytes not yet taken
  let pos = 2;
  let scanned = false;

  while (pos < bytes.length) {
    if (scanned) {
      pos = nextMarkerInScan(bytes, pos);
      if (pos < 0) return null;
    }
    const unitStart = pos; // fill bytes + marker + segment: removed or kept as one unit
    if (bytes[pos] !== MARKER_PREFIX) return null;
    while (bytes[pos + 1] === MARKER_PREFIX) pos++; // 0xFF fill bytes may precede a marker
    const marker = bytes[pos + 1];
    if (marker === undefined || marker === 0x00) return null; // cut off, or a stuffed zero where a marker must be

    if (marker === EOI) {
      if (!scanned) return null; // an image with no scan
      parts.push(bytes.subarray(copyFrom, pos + 2));
      return parts;
    }
    if (isStandalone(marker)) {
      pos += 2;
      continue;
    }

    if (pos + 3 >= bytes.length) return null; // the 2-byte length does not fit
    const length = (bytes[pos + 2] << 8) | bytes[pos + 3]; // counts its own 2 bytes, not the marker
    const end = pos + 2 + length;
    if (length < 2 || end > bytes.length) return null;
    if (DROPPED.has(marker)) {
      parts.push(bytes.subarray(copyFrom, unitStart));
      copyFrom = end;
      if (marker === APP1 && !orientation) {
        orientation = orientationOnlyExifSegment(bytes.subarray(pos + 4, end));
        if (orientation) parts.push(orientation); // takes the place of the first Exif segment that held one
      }
    }
    if (marker === SOS) scanned = true;
    pos = end;
  }
  return null; // ran out of bytes without reaching the end of the image
}
