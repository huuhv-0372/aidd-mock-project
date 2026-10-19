import { describe, expect, it } from "vitest";
import { stripWebpMetadata } from "@/lib/kudos/strip-webp-metadata";
import { ascii, contains, joined } from "./support/jpeg-fixtures";
import { VP8, vp8x, webp, webpChunk } from "./support/png-webp-fixtures";

const strip = (bytes: Uint8Array<ArrayBuffer>) => joined(stripWebpMetadata(bytes));

const EXIF = webpChunk("EXIF", [...ascii("MM"), 0, 42, ...ascii("GPS-LAT-21.03N-105.85E")]);
const XMP = webpChunk("XMP ", ascii("<x:xmpmeta>Hanoi office</x:xmpmeta>")); // odd length: padded
const C2PA = webpChunk("C2PA", ascii("jumb c2pa creator Jane Doe")); // C2PA / JUMBF provenance
const ICCP = webpChunk("ICCP", [1, 2, 3, 4]);
const ALPH = webpChunk("ALPH", [0, 1, 2, 3]);
const ANIM = webpChunk("ANIM", [0, 0, 0, 0, 0, 0]);
const ANMF = webpChunk("ANMF", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 8]);

const ALPHA = 0x10;
const ICC_FLAG = 0x20;
const EXIF_FLAG = 0x08;
const XMP_FLAG = 0x04;

describe("stripWebpMetadata", () => {
  it("drops EXIF and XMP chunks, clears their VP8X flags and rewrites the RIFF size", () => {
    const input = webp(vp8x(ICC_FLAG | ALPHA | EXIF_FLAG | XMP_FLAG), ICCP, ALPH, VP8, EXIF, XMP);
    const output = strip(input);
    expect(output).toEqual(webp(vp8x(ICC_FLAG | ALPHA), ICCP, ALPH, VP8));
    for (const secret of ["GPS-LAT", "Hanoi office", "xmpmeta"]) expect(contains(output!, ascii(secret))).toBe(false);
    const size = new DataView(output!.buffer, output!.byteOffset).getUint32(4, true);
    expect(size).toBe(output!.length - 8);
  });

  it("clears only the metadata flags and keeps the others (ICC, alpha, animation)", () => {
    const input = webp(vp8x(ICC_FLAG | 0x02 | EXIF_FLAG), ICCP, ANIM, ANMF, EXIF);
    expect(strip(input)).toEqual(webp(vp8x(ICC_FLAG | 0x02), ICCP, ANIM, ANMF));
  });

  it("drops an EXIF chunk even when the flag was never set, and fixes the size", () => {
    expect(strip(webp(vp8x(0), VP8, EXIF))).toEqual(webp(vp8x(0), VP8));
  });

  it("drops a C2PA provenance chunk (creator assertions)", () => {
    const output = strip(webp(vp8x(ALPHA), ALPH, VP8, C2PA));
    expect(output).toEqual(webp(vp8x(ALPHA), ALPH, VP8));
    expect(contains(output!, ascii("Jane Doe"))).toBe(false);
  });

  it("drops EXIF / XMP chunks that follow a simple VP8 image too", () => {
    expect(strip(webp(VP8, EXIF, XMP))).toEqual(webp(VP8));
  });

  it("passes a simple VP8 / VP8L file through unchanged", () => {
    const simple = webp(VP8);
    expect(strip(simple)).toEqual(simple);
    const lossless = webp(webpChunk("VP8L", [0x2f, 0, 0, 0, 0, 1, 2, 3]));
    expect(strip(lossless)).toEqual(lossless);
  });

  it("returns every byte of an extended file that has no metadata", () => {
    const input = webp(vp8x(ICC_FLAG), ICCP, VP8);
    expect(strip(input)).toEqual(input);
  });

  it("ignores bytes after the RIFF size (a payload appended to the file)", () => {
    const input = Uint8Array.from([...webp(vp8x(EXIF_FLAG), VP8, EXIF), ...ascii("APPENDED-SECRET")]);
    const output = strip(input);
    expect(output).toEqual(webp(vp8x(0), VP8));
    expect(contains(output!, ascii("SECRET"))).toBe(false);
  });

  it("does not modify the input array", () => {
    const input = webp(vp8x(EXIF_FLAG), VP8, EXIF);
    const snapshot = Uint8Array.from(input);
    stripWebpMetadata(input);
    expect(input).toEqual(snapshot);
  });

  const withRiffSize = (bytes: Uint8Array<ArrayBuffer>, size: number) => {
    const copy = Uint8Array.from(bytes);
    new DataView(copy.buffer).setUint32(4, size, true);
    return copy;
  };
  const good = webp(vp8x(EXIF_FLAG), VP8, EXIF);

  it.each([
    ["RIFF size beyond the file", withRiffSize(good, good.length)],
    ["no chunk at all", webp()],
    ["a chunk header cut off", webp(vp8x(0), [...ascii("VP8 "), 1, 0])],
    ["a chunk size that runs past the RIFF end", webp(vp8x(0), [...ascii("VP8 "), 0xff, 0xff, 0, 0, 1])],
    ["a VP8X chunk of the wrong size", webp(webpChunk("VP8X", [0, 0, 0, 0, 0, 0]), VP8)],
    ["not a RIFF WEBP file", Uint8Array.from([...ascii("RIFF"), 4, 0, 0, 0, ...ascii("WAVE")])],
  ])("rejects %s", (_name, input) => {
    expect(stripWebpMetadata(input)).toBeNull();
  });
});
