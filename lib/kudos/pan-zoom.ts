/**
 * Pan/zoom math for the Spotlight canvas. The canvas is drawn with
 * `transform: translate(x px, y px) scale(scale)` and `transform-origin: 0 0`, inside a viewport that
 * clips it. Pure functions: every result is already clamped.
 */
export type PanZoom = { scale: number; x: number; y: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;
export const INITIAL_PAN_ZOOM: PanZoom = { scale: 1, x: 0, y: 0 };

export const clampScale = (scale: number): number =>
  Number.isFinite(scale) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) : INITIAL_PAN_ZOOM.scale;

/** One axis: content smaller than the viewport is centred, larger content cannot leave a gap. */
function clampAxis(offset: number, viewport: number, content: number): number {
  if (content <= viewport) return (viewport - content) / 2;
  return Math.min(0, Math.max(viewport - content, offset));
}

export function clampPanZoom(state: PanZoom, viewport: Size, content: Size): PanZoom {
  const scale = clampScale(state.scale);
  return {
    scale,
    x: clampAxis(state.x, viewport.width, content.width * scale),
    y: clampAxis(state.y, viewport.height, content.height * scale),
  };
}

export function panBy(state: PanZoom, dx: number, dy: number, viewport: Size, content: Size): PanZoom {
  return clampPanZoom({ ...state, x: state.x + dx, y: state.y + dy }, viewport, content);
}

/** Zoom to `nextScale` keeping the canvas point under `anchor` (viewport coordinates) fixed. */
export function zoomAt(
  state: PanZoom,
  nextScale: number,
  anchor: Point,
  viewport: Size,
  content: Size,
): PanZoom {
  const scale = clampScale(nextScale);
  const ratio = scale / state.scale;
  return clampPanZoom(
    { scale, x: anchor.x - (anchor.x - state.x) * ratio, y: anchor.y - (anchor.y - state.y) * ratio },
    viewport,
    content,
  );
}

/** Scale multiplier for a wheel event: scrolling up (negative `deltaY`) zooms in. */
export const wheelScaleFactor = (deltaY: number): number => Math.exp(-deltaY * 0.0015);

/** Bring a canvas point (unscaled canvas coordinates) to the middle of the viewport. */
export function centerOn(state: PanZoom, target: Point, viewport: Size, content: Size): PanZoom {
  return clampPanZoom(
    {
      scale: state.scale,
      x: viewport.width / 2 - target.x * state.scale,
      y: viewport.height / 2 - target.y * state.scale,
    },
    viewport,
    content,
  );
}
