import type { SpotlightRecipient } from "@/lib/kudos/kudo-types";

/** Spotlight frame size from Figma node 2940:14174 (B.7_Spotlight): 1157 x 548. */
export const SPOTLIGHT_CANVAS = { width: 1157, height: 548 } as const;

export const SPOTLIGHT_FONT_MIN = 12;
export const SPOTLIGHT_FONT_MAX = 22;

export type SpotlightZone = { left: number; top: number; width: number; height: number };

/** Breathing room kept between a label and an overlay. */
const ZONE_MARGIN = 8;

/** The board draws a 1px border; overlays sit in the padding box inside it, so anchors measure from `size - 2px`. */
const inner = (outer: number) => outer - 2;

/**
 * Five ticker lines render 19px tall (Figma); the zone reserves 24px per line on purpose, as headroom
 * for a taller fallback font, so a label can never touch the ticker. 565 is the Figma line width.
 */
const TICKER_HEIGHT = 5 * 24;
const TICKER_WIDTH = 565;

/**
 * Padding-box size range of the board across every viewport one layout serves: the layout is computed once on the
 * server, so centred and right-pinned overlays (which move with the board width) need the union of their positions.
 */
type BoardRange = { height: number; minWidth: number; maxWidth: number };

/** md+: `h-[548px]`; section gutter px-12 from md (768px viewport -> 672px board), px-36 from xl, board capped at 1157px. */
const DESKTOP: BoardRange = { height: inner(548), minWidth: inner(768 - 2 * 48), maxWidth: inner(SPOTLIGHT_CANVAS.width) };
/** Below md: `h-[420px]`; 320-767px viewports minus the 16px gutters give 288-735px boards. */
const PHONE: BoardRange = { height: inner(420), minWidth: inner(288), maxWidth: inner(767 - 2 * 16) };

/** Box centred on the board (the total): union of its positions from the narrowest to the widest board. */
const centredZone = (r: BoardRange, top: number, width: number, height: number): SpotlightZone => ({
  left: r.minWidth / 2 - width / 2,
  top,
  width: (r.maxWidth - r.minWidth) / 2 + width,
  height,
});

/** Square box pinned to the bottom-right corner (Pan/Zoom): union of its positions across the width range. */
const cornerZone = (r: BoardRange, right: number, bottom: number, size: number): SpotlightZone => ({
  left: r.minWidth - right - size,
  top: r.height - bottom - size,
  width: r.maxWidth - r.minWidth + size,
  height: size,
});

/** Ticker pinned to the bottom-left: only its width (text length) varies, never its anchor. */
const tickerZone = (r: BoardRange, left: number, width: number): SpotlightZone => ({
  left,
  top: r.height - 20 - TICKER_HEIGHT,
  width,
  height: TICKER_HEIGHT,
});

/**
 * Fixed overlays of the board (spotlight-board / -search / -ticker) at the initial pan, scale 1, in canvas
 * coordinates; no label is placed inside them. md+ positions come from Figma B.7 (frame origin 142,1658):
 *  - total B.7.1 `3007:17482`: centred, top 14, 36px bold; 280 wide so totals up to ~4 digits fit.
 *  - search B.7.3 `2940:14833`: left 25, top 26, 219x39 pill + the 16px status line 8px below it.
 *  - ticker `2940:14230`: left 49, bottom 20, five lines.
 *  - pan/zoom B.7.2 `3007:17479`: right 31, bottom 40, 44x44 touch target.
 * The ticker and button are pinned to the board bottom (y = 546), so they are excluded relative to the first
 * 546px only. A taller canvas is scrolled by pan, never shown below that line initially, so it stays free.
 */
const DESKTOP_ZONES: readonly SpotlightZone[] = [
  centredZone(DESKTOP, 14, 280, 44),
  { left: 25, top: 26, width: 219, height: 39 + 8 + 16 },
  tickerZone(DESKTOP, 49, TICKER_WIDTH),
  cornerZone(DESKTOP, 31, 40, 44),
];

/**
 * The same overlays below md, where they sit elsewhere; labels must clear both sets:
 *  - total: top 12, centred.
 *  - search: left 16, top 68, 219x44 pill + the 16px status line 8px below it.
 *  - ticker: left 20, bottom 20, up to board width - 96 (`max-w-[calc(100%-6rem)]`).
 *  - pan/zoom: right 31, bottom 40, 44x44.
 */
const PHONE_ZONES: readonly SpotlightZone[] = [
  centredZone(PHONE, 12, 280, 44),
  { left: 16, top: 68, width: 219, height: 44 + 8 + 16 },
  tickerZone(PHONE, 20, Math.min(PHONE.maxWidth - 96, TICKER_WIDTH)),
  cornerZone(PHONE, 31, 40, 44),
];

export const SPOTLIGHT_OVERLAY_ZONES: readonly SpotlightZone[] = [...DESKTOP_ZONES, ...PHONE_ZONES].map((z) => ({
  left: z.left - ZONE_MARGIN,
  top: z.top - ZONE_MARGIN,
  width: z.width + 2 * ZONE_MARGIN,
  height: z.height + 2 * ZONE_MARGIN,
}));

const intersects = (a: SpotlightZone, b: SpotlightZone) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

const CELL_WIDTH = 165;
const CELL_HEIGHT = 36;
/** Rough average glyph width as a fraction of the font size (names are Latin + Vietnamese). */
const GLYPH_WIDTH_EM = 0.58;
const LINE_HEIGHT_EM = 1.3;

export type SpotlightNodeLayout = {
  id: string;
  /** Top-left of the label box inside the canvas; boxes never overlap. */
  left: number;
  top: number;
  /** Box size: labels longer than `width` should be ellipsised. */
  width: number;
  height: number;
  fontSize: number;
};

export type SpotlightLayout = {
  width: number;
  /** Grows past the Figma height only when there are more names than cells. */
  height: number;
  nodes: SpotlightNodeLayout[];
};

/** FNV-1a 32-bit: stable across server and browser, so SSR and hydration agree. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Log scale between the smallest and largest count so one huge count does not flatten the rest. */
function fontSizeFor(count: number, min: number, max: number): number {
  if (max <= min) return Math.round((SPOTLIGHT_FONT_MIN + SPOTLIGHT_FONT_MAX) / 2);
  const t = (Math.log(count + 1) - Math.log(min + 1)) / (Math.log(max + 1) - Math.log(min + 1));
  return Math.round(SPOTLIGHT_FONT_MIN + t * (SPOTLIGHT_FONT_MAX - SPOTLIGHT_FONT_MIN));
}

/**
 * Deterministic word-cloud placement: the canvas is a grid of cells; each name starts at the cell
 * picked by the hash of its id and probes forward to the next free cell, so no two labels overlap and none lands in an overlay zone.
 * The result depends only on the set of recipients, not on their input order.
 */
export function layoutSpotlight(recipients: readonly SpotlightRecipient[]): SpotlightLayout {
  const cols = Math.floor(SPOTLIGHT_CANVAS.width / CELL_WIDTH);
  const offsetX = (SPOTLIGHT_CANVAS.width - cols * CELL_WIDTH) / 2;
  const baseRows = Math.floor(SPOTLIGHT_CANVAS.height / CELL_HEIGHT);

  // Cells touching an overlay stay empty. Zones live inside the first `baseRows` rows, so the
  // canvas only grows (extra free rows below) when the names outnumber the remaining free cells.
  const blocked = new Set<number>();
  for (let cell = 0; cell < cols * baseRows; cell++) {
    const rect = {
      left: offsetX + (cell % cols) * CELL_WIDTH,
      top: Math.floor(cell / cols) * CELL_HEIGHT,
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
    };
    if (SPOTLIGHT_OVERLAY_ZONES.some((zone) => intersects(rect, zone))) blocked.add(cell);
  }

  const rows = Math.max(baseRows, Math.ceil((recipients.length + blocked.size) / cols));
  const height = Math.max(SPOTLIGHT_CANVAS.height, rows * CELL_HEIGHT);
  const cells = cols * rows;

  const counts = recipients.map((r) => r.kudos_count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  const taken = new Set<number>(blocked);
  const ordered = [...recipients].sort((a, b) => hash(a.id) - hash(b.id) || (a.id < b.id ? -1 : 1));
  const nodes = ordered.map((r): SpotlightNodeLayout => {
    let cell = hash(r.id) % cells;
    while (taken.has(cell)) cell = (cell + 1) % cells;
    taken.add(cell);

    const fontSize = fontSizeFor(r.kudos_count, minCount, maxCount);
    const boxHeight = Math.ceil(fontSize * LINE_HEIGHT_EM);
    const textWidth = Math.ceil((r.full_name ?? "").length * fontSize * GLYPH_WIDTH_EM);
    const width = Math.min(Math.max(textWidth, fontSize), CELL_WIDTH);
    // Slack inside the cell becomes a hash-derived jitter, kept strictly inside the cell.
    const jitter = hash(`${r.id}:jitter`);
    const slackX = CELL_WIDTH - width;
    const slackY = CELL_HEIGHT - boxHeight;

    return {
      id: r.id,
      left: offsetX + (cell % cols) * CELL_WIDTH + (jitter % (slackX + 1)),
      top: Math.floor(cell / cols) * CELL_HEIGHT + ((jitter >>> 8) % (slackY + 1)),
      width,
      height: boxHeight,
      fontSize,
    };
  });

  return { width: SPOTLIGHT_CANVAS.width, height, nodes };
}
