import { ascii } from "./jpeg-fixtures";

const be32 = (n: number) => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const le32 = (n: number) => be32(n).reverse();

// ---- PNG: 8-byte signature, then chunks (length, type, data, CRC). The CRC is not checked by the server: a fixed
// fake keeps kept chunks easy to compare byte for byte (they are never rewritten, so a real CRC would stay valid).
export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export const pngChunk = (type: string, data: number[] = []) => [
  ...be32(data.length), ...ascii(type), ...data, 0xc0, 0xff, 0xee, 0x01,
];
export const IHDR = pngChunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
export const IDAT = pngChunk("IDAT", [0x78, 0x9c, 1, 2, 3, 4, 5, 6, 7, 8]);
export const IEND = pngChunk("IEND");
export const png = (...chunks: number[][]) => Uint8Array.from([...PNG_SIGNATURE, ...chunks.flat()]);

// ---- WebP: RIFF container, chunks are FourCC + LE size + data, padded to an even length.
export const webpChunk = (fourcc: string, data: number[]) => [
  ...ascii(fourcc), ...le32(data.length), ...data, ...(data.length % 2 ? [0] : []),
];
/** VP8X: flags byte (0x08 EXIF, 0x04 XMP, 0x10 alpha, 0x20 ICC, 0x02 animation), 3 reserved, canvas 1x1. */
export const vp8x = (flags: number) => webpChunk("VP8X", [flags, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
export const VP8 = webpChunk("VP8 ", [0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 1, 0, 1, 0, 7]); // odd size: padded
export const webp = (...chunks: number[][]) => {
  const body = [...ascii("WEBP"), ...chunks.flat()];
  return Uint8Array.from([...ascii("RIFF"), ...le32(body.length), ...body]);
};
