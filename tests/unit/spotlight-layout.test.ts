import { describe, expect, it } from "vitest";
import type { SpotlightRecipient } from "@/lib/kudos/kudo-types";
import {
  SPOTLIGHT_CANVAS,
  SPOTLIGHT_FONT_MAX,
  SPOTLIGHT_FONT_MIN,
  SPOTLIGHT_OVERLAY_ZONES,
  layoutSpotlight,
  type SpotlightNodeLayout,
} from "@/lib/kudos/spotlight-layout";

function recipients(n: number): SpotlightRecipient[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `2a000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    full_name: i % 7 === 0 ? "Huỳnh Dương Xuân Nhật Thành" : `Sunner ${i + 1}`,
    kudos_count: (i * 37) % 53 + 1,
    last_received_at: "2026-10-14T03:00:00Z",
    last_kudo_id: `c1000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  }));
}

const overlaps = (a: SpotlightNodeLayout, b: SpotlightNodeLayout) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

function expectNoOverlap(nodes: SpotlightNodeLayout[]) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      expect(overlaps(nodes[i], nodes[j])).toBe(false);
    }
  }
}

type Rect = { left: number; top: number; width: number; height: number };

const rectsIntersect = (a: Rect, b: Rect) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

const contains = (outer: Rect, inner: Rect) =>
  outer.left <= inner.left &&
  outer.top <= inner.top &&
  outer.left + outer.width >= inner.left + inner.width &&
  outer.top + outer.height >= inner.top + inner.height;

/** Figma B.7 children, converted to frame coordinates (frame origin 142,1658 in the file). */
const FIGMA_OVERLAYS: Record<string, Rect> = {
  title: { left: 470, top: 14, width: 217, height: 44 },
  search: { left: 25, top: 26, width: 219, height: 39 },
  ticker: { left: 49, top: 505, width: 565, height: 23 },
  panZoom: { left: 1089, top: 471, width: 30, height: 30 },
};

/**
 * Overlay boxes as rendered in Chromium (measured on the real board, canvas = the padding box inside the
 * 1px border; the ticker's five rows render 19px tall, as in Figma). `inner` is the board's padding-box size.
 */
const TICKER_ROW = 19;

/** Below md: board h-[420px] (418 inner); `boardWidth` is the viewport minus the 16px section gutters. */
function phoneOverlays(boardWidth: number): Rect[] {
  const inner = boardWidth - 2;
  return [
    { left: (inner - 181) / 2, top: 12, width: 181, height: 44 },
    { left: 16, top: 68, width: 219, height: 44 + 8 + 16 },
    { left: 20, top: 418 - 20 - 5 * TICKER_ROW, width: inner - 96, height: 5 * TICKER_ROW },
    { left: inner - 31 - 44, top: 418 - 40 - 44, width: 44, height: 44 },
  ];
}

/**
 * md+: board h-[548px] (546 inner). Its width follows the viewport (px-12 from md, px-36 from xl, max 1157), so
 * the total centres on the board and the right-pinned Pan/Zoom button moves with it. The ticker is as wide
 * as its text (506px measured), capped at the board width minus 6rem.
 */
function desktopOverlays(boardWidth: number): Rect[] {
  const inner = boardWidth - 2;
  return [
    { left: (inner - 217) / 2, top: 14, width: 217, height: 44 },
    { left: 25, top: 26, width: 219, height: 39 + 8 + 16 },
    { left: 49, top: 546 - 20 - 5 * TICKER_ROW, width: Math.min(506, inner - 96), height: 5 * TICKER_ROW },
    { left: inner - 31 - 44, top: 546 - 40 - 44, width: 44, height: 44 },
  ];
}

describe("layoutSpotlight", () => {
  it("is deterministic and independent of input order", () => {
    const list = recipients(30);
    const first = layoutSpotlight(list);
    expect(layoutSpotlight(list)).toEqual(first);
    expect(layoutSpotlight([...list].reverse())).toEqual(first);
  });

  it("uses the Figma canvas width and keeps every node inside the canvas", () => {
    const layout = layoutSpotlight(recipients(40));
    expect(layout.width).toBe(SPOTLIGHT_CANVAS.width);
    expect(layout.height).toBe(SPOTLIGHT_CANVAS.height);
    expect(layout.nodes).toHaveLength(40);
    for (const n of layout.nodes) {
      expect(n.left).toBeGreaterThanOrEqual(0);
      expect(n.top).toBeGreaterThanOrEqual(0);
      expect(n.left + n.width).toBeLessThanOrEqual(layout.width);
      expect(n.top + n.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it("never overlaps two labels, even with 200 names (canvas grows taller instead)", () => {
    const layout = layoutSpotlight(recipients(200));
    expect(layout.nodes).toHaveLength(200);
    expect(new Set(layout.nodes.map((n) => n.id)).size).toBe(200);
    expect(layout.height).toBeGreaterThan(SPOTLIGHT_CANVAS.height);
    expectNoOverlap(layout.nodes);
    for (const n of layout.nodes) expect(n.top + n.height).toBeLessThanOrEqual(layout.height);
  });

  it("sizes the font by kudos count within the allowed range", () => {
    const list = recipients(40);
    const layout = layoutSpotlight(list);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    const sorted = [...list].sort((a, b) => a.kudos_count - b.kudos_count);
    expect(byId.get(sorted[0].id)?.fontSize).toBe(SPOTLIGHT_FONT_MIN);
    expect(byId.get(sorted[sorted.length - 1].id)?.fontSize).toBe(SPOTLIGHT_FONT_MAX);
    for (const n of layout.nodes) {
      expect(n.fontSize).toBeGreaterThanOrEqual(SPOTLIGHT_FONT_MIN);
      expect(n.fontSize).toBeLessThanOrEqual(SPOTLIGHT_FONT_MAX);
    }
  });

  it("handles one recipient, equal counts, missing names and an empty list", () => {
    expect(layoutSpotlight([]).nodes).toEqual([]);
    const [one] = layoutSpotlight(recipients(1)).nodes;
    expect(one.fontSize).toBeGreaterThanOrEqual(SPOTLIGHT_FONT_MIN);
    const same = recipients(5).map((r) => ({ ...r, kudos_count: 3, full_name: null }));
    const layout = layoutSpotlight(same);
    expect(layout.nodes).toHaveLength(5);
    expectNoOverlap(layout.nodes);
  });

  describe("overlay zones", () => {
    it("cover every Figma overlay (title, search, ticker, pan/zoom) with a margin", () => {
      for (const rect of Object.values(FIGMA_OVERLAYS)) {
        expect(SPOTLIGHT_OVERLAY_ZONES.some((zone) => contains(zone, rect))).toBe(true);
      }
    });

    it.each([20, 105, 200])("keeps every label of %i names out of the overlay zones", (count) => {
      const layout = layoutSpotlight(recipients(count));
      expect(layout.nodes).toHaveLength(count);
      for (const node of layout.nodes) {
        for (const zone of SPOTLIGHT_OVERLAY_ZONES) expect(rectsIntersect(node, zone)).toBe(false);
      }
      expectNoOverlap(layout.nodes);
    });

    // The layout is computed once for every viewport, so it must clear the overlay spots (initial pan, scale 1)
    // at every board width: below md from 288px (320px phone) through 343 / 398 (375 / 430px phones) to 735px
    // (767px viewport), and md+ from 672px (768px viewport) through 928 (1024), 992 (1280, xl), 1152 (1440) up to 1157.
    it.each([
      ...[288, 343, 398, 480, 600, 735].map((width) => [`${width}px phone board`, phoneOverlays(width)] as const),
      ...[672, 800, 928, 992, 1152, 1157].map((width) => [`${width}px desktop board`, desktopOverlays(width)] as const),
    ])("keeps labels clear of the overlays rendered on a %s", (_name, overlays) => {
      for (const count of [20, 60, 105, 200]) {
        for (const node of layoutSpotlight(recipients(count)).nodes) {
          for (const overlay of overlays) expect(rectsIntersect(node, overlay)).toBe(false);
        }
      }
    });

    it("grows the canvas once the free cells run out, instead of using zone cells", () => {
      expect(layoutSpotlight(recipients(40)).height).toBe(SPOTLIGHT_CANVAS.height);
      expect(layoutSpotlight(recipients(105)).height).toBeGreaterThan(SPOTLIGHT_CANVAS.height);
    });
  });
});
