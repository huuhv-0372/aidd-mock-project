import { describe, expect, it } from "vitest";
import { stripJpegMetadata } from "@/lib/kudos/strip-jpeg-metadata";
import { APP0, ascii, contains, DQT, EOI, ICC, jpeg, joined, SCAN, segment, SOF0, SOS, XMP } from "./support/jpeg-fixtures";

const strip = (bytes: Uint8Array<ArrayBuffer>) => joined(stripJpegMetadata(bytes));

const u16 = (n: number, little: boolean) => (little ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
const u32 = (n: number, little: boolean) => {
  const be = [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  return little ? be.reverse() : be;
};
const tag = (id: number, type: number, count: number, value: number[], little: boolean) =>
  [...u16(id, little), ...u16(type, little), ...u32(count, little), ...value];
const order = (little: boolean) => ascii(little ? "II" : "MM");

/**
 * A full camera-style APP1: IFD0 with Make, [Orientation], Artist and a GPS IFD pointer, plus the strings and the
 * GPS IFD in the data area. `orientation: null` leaves the Orientation entry out.
 */
function exifApp1(orientation: number | null, little: boolean) {
  const entries = orientation === null ? 3 : 4;
  const makeAt = 8 + 2 + entries * 12 + 4;
  const artistAt = makeAt + 6;
  const gpsAt = artistAt + 9;
  const tiff = [
    ...order(little), ...u16(42, little), ...u32(8, little), ...u16(entries, little),
    ...tag(0x010f, 2, 6, u32(makeAt, little), little),
    ...(orientation === null ? [] : tag(0x0112, 3, 1, [...u16(orientation, little), 0, 0], little)),
    ...tag(0x013b, 2, 9, u32(artistAt, little), little),
    ...tag(0x8825, 4, 1, u32(gpsAt, little), little),
    ...u32(0, little),
    ...ascii("Canon\0"), ...ascii("John Doe\0"),
    ...u16(1, little), ...tag(1, 2, 2, [...ascii("N\0"), 0, 0], little), ...u32(0, little),
  ];
  return segment(0xe1, [...ascii("Exif\0\0"), ...tiff]);
}

/** What must come out: APP1 + Exif header + TIFF header + IFD0 with the single Orientation entry + next IFD 0. */
const orientationOnly = (orientation: number, little: boolean) =>
  segment(0xe1, [
    ...ascii("Exif\0\0"), ...order(little), ...u16(42, little), ...u32(8, little), ...u16(1, little),
    ...tag(0x0112, 3, 1, [...u16(orientation, little), 0, 0], little), ...u32(0, little),
  ]);

const rest = [ICC, DQT, SOF0, SOS, SCAN, EOI];
const without = jpeg(APP0, ...rest);
const input = (app1: number[]) => jpeg(APP0, app1, ...rest);

describe("stripJpegMetadata keeps the Orientation tag so portrait photos stay upright", () => {
  it.each([
    ["little-endian (II)", true],
    ["big-endian (MM)", false],
  ])("orientation 6 in a %s Exif survives as a 36-byte Orientation-only APP1", (_name, little) => {
    const output = strip(input(exifApp1(6, little)));
    expect(output).toEqual(jpeg(APP0, orientationOnly(6, little), ...rest));
    expect(output!.length).toBe(without.length + 36);
    for (const gone of ["Canon", "John Doe", "N\0"]) expect(contains(output!, ascii(gone))).toBe(false);
  });

  it.each([2, 3, 4, 5, 6, 7, 8])("keeps orientation %i", (value) => {
    expect(strip(input(exifApp1(value, false)))).toEqual(jpeg(APP0, orientationOnly(value, false), ...rest));
  });

  it("puts the Orientation-only APP1 where the original sat and keeps one when several Exif segments repeat it", () => {
    const output = strip(jpeg(APP0, exifApp1(8, true), ICC, exifApp1(8, true), DQT, SOF0, SOS, SCAN, EOI));
    expect(output).toEqual(jpeg(APP0, orientationOnly(8, true), ICC, DQT, SOF0, SOS, SCAN, EOI));
  });

  it("still drops an XMP APP1 (no Exif header, nothing to keep)", () => {
    expect(strip(input(XMP))).toEqual(without);
  });

  it.each([
    ["orientation 1 (already upright)", exifApp1(1, true)],
    ["no orientation entry", exifApp1(null, false)],
    ["orientation 0", exifApp1(0, true)],
    ["orientation 9", exifApp1(9, false)],
  ])("drops the whole APP1 for %s", (_name, app1) => {
    expect(strip(input(app1))).toEqual(without);
  });
});

describe("stripJpegMetadata with a corrupt Exif body", () => {
  const patch = (app1: number[], at: number, bytes: number[]) => {
    const copy = [...app1];
    copy.splice(at, bytes.length, ...bytes);
    return copy;
  };
  // Offsets in the segment: 0-1 FF E1, 2-3 length, 4-9 "Exif\0\0", 10-11 byte order, 12-13 magic, 14-17 IFD0 offset,
  // 18-19 entry count, 20.. entries (Make first, Orientation second at 32-43).
  const valid = exifApp1(6, false);
  it.each([
    ["unknown byte order", patch(valid, 10, [0x58, 0x58])],
    ["wrong TIFF magic", patch(valid, 12, [0x00, 0x2b])],
    ["IFD0 offset beyond the data", patch(valid, 14, [0xff, 0xff, 0xff, 0xf0])],
    ["entry count larger than the data", patch(valid, 18, [0xff, 0xff])],
    ["Orientation typed LONG, not SHORT", patch(valid, 34, [0x00, 0x04])],
    ["Orientation with count 2", patch(valid, 39, [0x02])],
    ["body cut off after the byte order", segment(0xe1, [...ascii("Exif\0\0"), ...ascii("MM"), 0, 42])],
    ["only the Exif header", segment(0xe1, ascii("Exif\0\0"))],
    ["not Exif at all", segment(0xe1, ascii("Exiff-and-then-some-bytes-here"))],
  ])("drops the APP1 and accepts the image: %s", (_name, app1) => {
    expect(strip(input(app1))).toEqual(without);
  });
});
