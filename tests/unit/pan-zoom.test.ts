import { describe, expect, it } from "vitest";
import {
  INITIAL_PAN_ZOOM,
  MAX_SCALE,
  MIN_SCALE,
  centerOn,
  clampPanZoom,
  clampScale,
  panBy,
  wheelScaleFactor,
  zoomAt,
} from "@/lib/kudos/pan-zoom";

const viewport = { width: 1000, height: 500 };
const content = { width: 1000, height: 500 };

describe("clampScale", () => {
  it("clamps to the allowed range and survives non-finite input", () => {
    expect(clampScale(0.1)).toBe(MIN_SCALE);
    expect(clampScale(10)).toBe(MAX_SCALE);
    expect(clampScale(2)).toBe(2);
    expect(clampScale(Number.NaN)).toBe(1);
  });
});

describe("clampPanZoom", () => {
  it("centres content smaller than the viewport", () => {
    expect(clampPanZoom({ scale: 0.5, x: 300, y: -40 }, viewport, content)).toEqual({ scale: 0.5, x: 250, y: 125 });
  });

  it("keeps larger content covering the viewport (no gap on any edge)", () => {
    expect(clampPanZoom({ scale: 2, x: 50, y: 50 }, viewport, content)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(clampPanZoom({ scale: 2, x: -5000, y: -5000 }, viewport, content)).toEqual({ scale: 2, x: -1000, y: -500 });
  });

  it("clamps an out-of-range scale before computing bounds", () => {
    expect(clampPanZoom({ scale: 9, x: 0, y: 0 }, viewport, content).scale).toBe(MAX_SCALE);
  });
});

describe("panBy", () => {
  it("moves within bounds and stops at the edge", () => {
    const zoomed = { scale: 2, x: -100, y: -100 };
    expect(panBy(zoomed, -50, 20, viewport, content)).toEqual({ scale: 2, x: -150, y: -80 });
    expect(panBy(zoomed, 500, 500, viewport, content)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(panBy(zoomed, -5000, -5000, viewport, content)).toEqual({ scale: 2, x: -1000, y: -500 });
  });
});

describe("zoomAt", () => {
  it("keeps the canvas point under the pointer fixed", () => {
    const anchor = { x: 400, y: 200 };
    const before = { scale: 1.5, x: -300, y: -100 };
    const worldBefore = { x: (anchor.x - before.x) / before.scale, y: (anchor.y - before.y) / before.scale };
    const after = zoomAt(before, 2.5, anchor, viewport, content);
    expect(after.scale).toBe(2.5);
    expect((anchor.x - after.x) / after.scale).toBeCloseTo(worldBefore.x);
    expect((anchor.y - after.y) / after.scale).toBeCloseTo(worldBefore.y);
  });

  it("clamps the scale and the resulting pan", () => {
    const after = zoomAt(INITIAL_PAN_ZOOM, 99, { x: 0, y: 0 }, viewport, content);
    expect(after.scale).toBe(MAX_SCALE);
    expect(after.x).toBeLessThanOrEqual(0);
    expect(after.x).toBeGreaterThanOrEqual(viewport.width - content.width * MAX_SCALE);
  });

  it("zooming out below the viewport size re-centres the content", () => {
    expect(zoomAt(INITIAL_PAN_ZOOM, 0.5, { x: 0, y: 0 }, viewport, content)).toEqual({ scale: 0.5, x: 250, y: 125 });
  });
});

describe("centerOn", () => {
  it("puts the target in the middle of the viewport when bounds allow", () => {
    const next = centerOn({ scale: 2, x: 0, y: 0 }, { x: 600, y: 300 }, viewport, content);
    expect(next).toEqual({ scale: 2, x: -700, y: -350 });
    expect(600 * 2 + next.x).toBe(viewport.width / 2);
  });

  it("clamps when the target is near an edge", () => {
    expect(centerOn({ scale: 2, x: 0, y: 0 }, { x: 10, y: 10 }, viewport, content)).toEqual({ scale: 2, x: 0, y: 0 });
  });
});

describe("wheelScaleFactor", () => {
  it("zooms in on scroll up and out on scroll down", () => {
    expect(wheelScaleFactor(-100)).toBeGreaterThan(1);
    expect(wheelScaleFactor(100)).toBeLessThan(1);
    expect(wheelScaleFactor(0)).toBe(1);
  });
});
