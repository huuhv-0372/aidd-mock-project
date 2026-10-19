import { describe, expect, it } from "vitest";
import { stripPngMetadata } from "@/lib/kudos/strip-png-metadata";
import { ascii, contains, joined } from "./support/jpeg-fixtures";
import { IDAT, IEND, IHDR, PNG_SIGNATURE, png, pngChunk } from "./support/png-webp-fixtures";

const strip = (bytes: Uint8Array<ArrayBuffer>) => joined(stripPngMetadata(bytes));

const EXIF = pngChunk("eXIf", [...ascii("MM"), 0, 42, ...ascii("GPS-LAT-21.03N-105.85E")]);
const TEXT = pngChunk("tEXt", ascii("Author\0Jane Doe"));
const ITXT = pngChunk("iTXt", ascii("Comment\0\0\0\0\0Hanoi office"));
const ZTXT = pngChunk("zTXt", [...ascii("Software\0"), 0, 0x78, 0x9c, 1, 2, 3]);
const TIME = pngChunk("tIME", [0x07, 0xea, 10, 19, 14, 30, 5]);
const CABX = pngChunk("caBX", ascii("jumb c2pa creator Jane Doe")); // C2PA / JUMBF provenance
const KEEP = [
  pngChunk("gAMA", [0, 1, 0x86, 0xa0]), pngChunk("pHYs", [0, 0, 0x0b, 0x13, 0, 0, 0x0b, 0x13, 1]),
  pngChunk("iCCP", [...ascii("sRGB\0"), 0, 1, 2]), pngChunk("PLTE", [1, 2, 3]), pngChunk("tRNS", [0xff]),
  pngChunk("acTL", [0, 0, 0, 2, 0, 0, 0, 0]),
];

describe("stripPngMetadata", () => {
  it.each([
    ["eXIf", EXIF, "GPS-LAT"],
    ["tEXt", TEXT, "Jane Doe"],
    ["iTXt", ITXT, "Hanoi office"],
    ["zTXt", ZTXT, "Software"],
    ["tIME", TIME, ""],
    ["caBX", CABX, "Jane Doe"],
  ])("drops a %s chunk and keeps the rest byte for byte", (_type, chunk, secret) => {
    const output = strip(png(IHDR, chunk, IDAT, IEND));
    expect(output).toEqual(png(IHDR, IDAT, IEND));
    if (secret) expect(contains(output!, ascii(secret))).toBe(false);
  });

  it("drops every metadata chunk wherever it sits and leaves other chunks (and their CRCs) untouched", () => {
    const input = png(IHDR, TEXT, ...KEEP, EXIF, ITXT, IDAT, TIME, ZTXT, IDAT, IEND);
    expect(strip(input)).toEqual(png(IHDR, ...KEEP, IDAT, IDAT, IEND));
  });

  it("returns the whole file when there is no metadata", () => {
    const input = png(IHDR, ...KEEP, IDAT, IEND);
    expect(strip(input)).toEqual(input);
  });

  it("stops after IEND: trailing bytes (a hidden payload, a second image) are dropped", () => {
    const input = png(IHDR, TEXT, IDAT, IEND, ascii("TRAILING-SECRET"), [...PNG_SIGNATURE, ...IHDR, ...IEND]);
    const output = strip(input);
    expect(output).toEqual(png(IHDR, IDAT, IEND));
    expect(contains(output!, ascii("SECRET"))).toBe(false);
  });

  it("does not modify the input array", () => {
    const input = png(IHDR, TEXT, IDAT, IEND);
    const snapshot = Uint8Array.from(input);
    stripPngMetadata(input);
    expect(input).toEqual(snapshot);
  });

  it.each([
    ["a bad signature", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b, ...IHDR, ...IEND])],
    ["a truncated signature", Uint8Array.from([0x89, 0x50, 0x4e, 0x47])],
    ["the first chunk is not IHDR", png(IDAT, IHDR, IEND)],
    ["IHDR with a length other than 13", png(pngChunk("IHDR", [0, 0, 0, 1]), IDAT, IEND)],
    ["no IEND", png(IHDR, IDAT)],
    ["a chunk length that runs past the end", png(IHDR, [0x00, 0x10, 0x00, 0x00, ...ascii("IDAT"), 1, 2, 3])],
    ["a chunk cut off inside its header", png(IHDR, [0x00, 0x00, 0x00])],
    ["a chunk cut off before its CRC", png(IHDR, [0, 0, 0, 2, ...ascii("IDAT"), 1, 2, 3])],
    ["a length of 2 GiB or more", png(IHDR, [0x80, 0x00, 0x00, 0x00, ...ascii("IDAT"), 1, 2, 3, 4])],
    ["only the signature", Uint8Array.from(PNG_SIGNATURE)],
  ])("rejects %s", (_name, input) => {
    expect(stripPngMetadata(input)).toBeNull();
  });
});
