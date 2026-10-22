import { expect, type Locator, type Page } from "@playwright/test";

// WCAG 2.2 SC 1.4.11 (non-text contrast): a keyboard focus indicator needs 3:1 against the surface it is drawn on.
// The ring is drawn OUTSIDE the element (outline-offset), so the surface is the element's parent chain, not its own fill.

type Rgba = { r: number; g: number; b: number; a: number };
export type FocusSample = { outlineStyle: string; outlineWidth: number; outlineColor: string; surfaces: string[] };

/** Parses the colour forms getComputedStyle gives for sRGB values: rgb()/rgba() (comma or space) and color(srgb ...). */
export function parseColor(css: string): Rgba {
  const srgb = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)$/.exec(css.trim());
  if (srgb) {
    const alpha = srgb[4] === undefined ? 1 : srgb[4].endsWith("%") ? parseFloat(srgb[4]) / 100 : parseFloat(srgb[4]);
    return { r: +srgb[1] * 255, g: +srgb[2] * 255, b: +srgb[3] * 255, a: alpha };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(css.trim());
  if (!rgb) throw new Error(`focus-contrast: cannot parse the computed colour "${css}"`);
  const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith("%") ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
  return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: alpha };
}

const over = (top: Rgba, base: Rgba): Rgba => ({
  r: top.r * top.a + base.r * (1 - top.a),
  g: top.g * top.a + base.g * (1 - top.a),
  b: top.b * top.a + base.b * (1 - top.a),
  a: 1,
});

function luminance({ r, g, b }: Rgba): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between an outline colour and the stack of backgrounds (nearest ancestor first) it sits on. */
export function contrastOnSurface(outline: string, surfaces: string[]): number {
  let surface: Rgba = { r: 255, g: 255, b: 255, a: 1 }; // the canvas, if no ancestor is opaque
  for (const css of [...surfaces].reverse()) {
    const layer = parseColor(css);
    if (layer.a > 0) surface = over(layer, surface);
  }
  const ink = over(parseColor(outline), surface);
  const [hi, lo] = [luminance(ink), luminance(surface)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Keyboard-focuses the element (a Tab first, so :focus-visible applies) and reads its ring and the surface behind it. */
export async function sampleFocusRing(page: Page, target: Locator): Promise<FocusSample> {
  await expect(target).toBeVisible();
  await page.keyboard.press("Tab");
  await target.focus();
  return target.evaluate(async (el) => {
    // `transition-colors` also animates outline-color: read the settled ring, not a frame of the fade from currentColor.
    await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    const surfaces: string[] = [];
    for (let node = el.parentElement; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      surfaces.push(bg);
      if (/^rgb\(/.test(bg) || /^color\(srgb [^/]*\)$/.test(bg)) break; // opaque: nothing behind it shows
    }
    const style = getComputedStyle(el);
    return {
      focusVisible: el.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
      surfaces,
    };
  }).then(({ focusVisible, ...sample }) => {
    expect(focusVisible, "the element must match :focus-visible after a keyboard focus").toBe(true);
    return sample;
  });
}

/** Asserts the focus ring of `target` is visible and has at least 3:1 contrast on the surface behind it. */
export async function expectFocusRingContrast(page: Page, target: Locator, label: string): Promise<void> {
  const sample = await sampleFocusRing(page, target);
  expect(sample.outlineStyle, `${label}: focus ring is drawn`).not.toBe("none");
  expect(sample.outlineWidth, `${label}: focus ring has a width`).toBeGreaterThan(0);
  const ratio = contrastOnSurface(sample.outlineColor, sample.surfaces);
  expect(ratio, `${label}: ring ${sample.outlineColor} on ${sample.surfaces.join(" over ")} = ${ratio.toFixed(2)}:1, needs 3:1`).toBeGreaterThanOrEqual(3);
}
