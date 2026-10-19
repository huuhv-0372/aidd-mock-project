// Byte builders for the image metadata tests: every fixture is assembled in-test, no binary files.
export const SOI = [0xff, 0xd8];
export const EOI = [0xff, 0xd9];
export const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
export const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
/** A marker segment: FF <marker> <2-byte length incl. itself> <payload>. */
export const segment = (marker: number, payload: number[]) => [0xff, marker, ...be16(payload.length + 2), ...payload];

export const APP0 = segment(0xe0, [...ascii("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
export const XMP = segment(0xe1, ascii("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>"));
export const APP11 = segment(0xeb, [...ascii("JP"), 0, 0, ...ascii("jumb-c2pa-provenance")]);
export const IPTC = segment(0xed, [...ascii("Photoshop 3.0\0"), ...ascii("8BIM"), 4, 4, 0, 0]);
export const ICC = segment(0xe2, [...ascii("ICC_PROFILE\0"), 1, 1, 9, 9, 9]);
export const COMMENT = segment(0xfe, ascii("hello"));
export const DQT = segment(0xdb, [0, ...new Array<number>(64).fill(3)]);
export const SOF0 = segment(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
export const SOS = segment(0xda, [1, 1, 0, 0, 0x3f, 0]);
// Entropy-coded data: byte-stuffed FF00 and a restart marker are legal here; it must pass through untouched.
export const SCAN = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0x78];

export const jpeg = (...parts: number[][]) => Uint8Array.from([...SOI, ...parts.flat()]);
export const contains = (bytes: Uint8Array, needle: number[]) =>
  bytes.some((_, i) => needle.every((b, j) => bytes[i + j] === b));

/** The strippers return the kept pieces (a Blob is built from them without joining); tests compare the joined bytes. */
export const joined = (parts: Uint8Array[] | null): Uint8Array | null =>
  parts && Uint8Array.from(parts.flatMap((part) => [...part]));
