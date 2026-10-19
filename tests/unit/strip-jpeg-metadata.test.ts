import { describe, expect, it } from "vitest";
import { stripJpegMetadata } from "@/lib/kudos/strip-jpeg-metadata";
import {
  APP0, APP11, COMMENT, contains, DQT, EOI, ICC, IPTC, ascii, jpeg, joined, SCAN, segment, SOF0, SOS, SOI, XMP,
} from "./support/jpeg-fixtures";

const strip = (bytes: Uint8Array<ArrayBuffer>) => joined(stripJpegMetadata(bytes));

// An APP1 whose TIFF body is not a real TIFF (no parsable orientation): it must simply be dropped.
const EXIF = segment(0xe1, [...ascii("Exif\0\0"), ...ascii("MM"), 0, 42, 0, 0, 0, 8, ...ascii("GPS-LAT-21.03N-105.85E")]);
const DHT = segment(0xc4, [0x00, 1, 2, 3, 4]);

describe("stripJpegMetadata: header segments", () => {
  it("removes the APP1 Exif segment and keeps every other byte identical", () => {
    const input = jpeg(APP0, EXIF, ICC, DQT, SOF0, SOS, SCAN, EOI);
    const output = strip(input);
    expect(output).toEqual(jpeg(APP0, ICC, DQT, SOF0, SOS, SCAN, EOI));
    expect(contains(output!, ascii("Exif\0\0"))).toBe(false);
    expect(contains(output!, ascii("GPS-LAT"))).toBe(false);
    expect([...output!.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect([...output!.subarray(-2)]).toEqual(EOI);
  });

  it("also removes XMP (a second APP1), APP11 (JUMBF / C2PA), APP13 / IPTC and COM comments, wherever they sit", () => {
    const input = jpeg(IPTC, APP0, XMP, COMMENT, EXIF, APP11, DQT, IPTC, SOF0, SOS, SCAN, EOI);
    expect(strip(input)).toEqual(jpeg(APP0, DQT, SOF0, SOS, SCAN, EOI));
  });

  it("returns every byte when there is nothing to remove", () => {
    const input = jpeg(APP0, ICC, DQT, SOF0, SOS, SCAN, EOI);
    expect(strip(input)).toEqual(input);
  });

  it("accepts 0xFF fill bytes before a marker (they leave with a removed segment, stay with a kept one)", () => {
    const input = jpeg(APP0, [0xff, 0xff], EXIF, [0xff], DQT, SOF0, SOS, SCAN, EOI);
    expect(strip(input)).toEqual(jpeg(APP0, [0xff], DQT, SOF0, SOS, SCAN, EOI));
  });

  it("does not modify the input array", () => {
    const input = jpeg(APP0, EXIF, SOF0, SOS, SCAN, EOI);
    const snapshot = Uint8Array.from(input);
    stripJpegMetadata(input);
    expect(input).toEqual(snapshot);
  });
});

describe("stripJpegMetadata: the scan and what follows the first end-of-image", () => {
  it("truncates right after the first EOI: a trailing MPF image or motion-photo video is dropped", () => {
    const secondImage = [...jpeg(APP0, EXIF, SOF0, SOS, SCAN, EOI)];
    const input = jpeg(APP0, EXIF, SOF0, SOS, SCAN, EOI, secondImage, ascii("ftypmp42-MOTION-PHOTO-VIDEO"));
    const output = strip(input);
    expect(output).toEqual(jpeg(APP0, SOF0, SOS, SCAN, EOI));
    expect(contains(output!, ascii("MOTION-PHOTO"))).toBe(false);
  });

  it("does not take FF 00 (stuffing), FF D0-D7 (restart) or FF FF (fill) for the end of the image", () => {
    const tricky = [0x01, 0xff, 0x00, 0xd9, 0x02, 0xff, 0xd0, 0x03, 0xff, 0xd7, 0x04, 0xff]; // ends in a fill FF before EOI
    const input = jpeg(APP0, SOF0, SOS, tricky, EOI, ascii("tail"));
    expect(strip(input)).toEqual(jpeg(APP0, SOF0, SOS, tricky, EOI));
  });

  it("walks a multi-scan (progressive) file: segments between scans are skipped by length, even if they hold FF D9", () => {
    const trickyTable = segment(0xc4, [0x00, 0xff, 0xd9, 1, 2, 3]);
    const input = jpeg(APP0, SOF0, DHT, SOS, SCAN, trickyTable, SOS, SCAN, EOI, ascii("tail"));
    expect(strip(input)).toEqual(jpeg(APP0, SOF0, DHT, SOS, SCAN, trickyTable, SOS, SCAN, EOI));
  });

  it("also drops APP1 / COM / APP11 that sit between scans", () => {
    const input = jpeg(APP0, SOF0, SOS, SCAN, EXIF, COMMENT, SOS, SCAN, APP11, EOI);
    expect(strip(input)).toEqual(jpeg(APP0, SOF0, SOS, SCAN, SOS, SCAN, EOI));
  });

  it.each([
    ["no EOI after the scan", jpeg(APP0, SOF0, SOS, SCAN)],
    ["the scan ends in a lone FF", jpeg(APP0, SOF0, SOS, SCAN, [0xff])],
    ["a segment after the scan runs past the end", jpeg(APP0, SOF0, SOS, SCAN, [0xff, 0xc4, 0x7f, 0xff, 1])],
    ["a segment after the scan has a length below 2", jpeg(APP0, SOF0, SOS, SCAN, [0xff, 0xc4, 0x00, 0x01], EOI)],
    ["the only EOI is hidden inside a segment payload", jpeg(APP0, SOF0, SOS, SCAN, segment(0xc4, [0xff, 0xd9]))],
  ])("rejects: %s", (_name, input) => {
    expect(stripJpegMetadata(input)).toBeNull();
  });
});

describe("stripJpegMetadata: malformed headers", () => {
  it.each([
    ["APP1 length runs past the end of the file", jpeg([0xff, 0xe1, 0xff, 0xff, 1, 2, 3])],
    ["APP1 length below the 2-byte minimum", jpeg(APP0, [0xff, 0xe1, 0x00, 0x01], SOF0, SOS, SCAN, EOI)],
    ["kept segment length runs past the end", jpeg(APP0, [0xff, 0xdb, 0x7f, 0xff, 1, 2], SOS, SCAN, EOI)],
    ["header cut off inside a length field", jpeg(APP0, [0xff, 0xe1, 0x00])],
    ["header cut off right after the marker prefix", jpeg(APP0, [0xff])],
    ["a byte that is not a marker where one must start", jpeg(APP0, [0x07, 0x07, 0x07], SOS, SCAN, EOI)],
    ["no start-of-scan before the end of the file", jpeg(APP0, EXIF, SOF0, EOI)],
    ["only the SOI", Uint8Array.from(SOI)],
  ])("rejects: %s", (_name, input) => {
    expect(stripJpegMetadata(input)).toBeNull();
  });
});
