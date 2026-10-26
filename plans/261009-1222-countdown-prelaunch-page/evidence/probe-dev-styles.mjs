// Read-only probe of computed styles on the user's dev server (localhost:3000).
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 821 } });
const res = await p.goto("http://localhost:3000/countdown", { waitUntil: "networkidle" });
await p.getByTestId("countdown-minutes").waitFor({ timeout: 15000 });
const info = await p.evaluate(() => {
  const cs = (el) => el && getComputedStyle(el);
  const main = document.querySelector("main");
  const digit = document.querySelector('[data-testid="countdown-days"] span span:last-child');
  const box = document.querySelector('[data-testid="countdown-days"] span span:first-child');
  const h1 = document.querySelector("h1");
  const cover = main?.children?.[1];
  const sheets = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join("\n"); } catch { return ""; } }).join("\n");
  return {
    mainBg: cs(main)?.backgroundColor, mainClass: main?.className,
    coverBg: cs(cover)?.backgroundImage?.slice(0, 80), coverClass: cover?.className,
    digitFont: cs(digit)?.fontFamily, h1Font: cs(h1)?.fontFamily,
    boxBorder: cs(box)?.borderColor, boxOpacity: cs(box)?.opacity,
    htmlClass: document.documentElement.className,
    hasThemeToken: sheets.includes("--color-countdown-bg"), hasBgClass: sheets.includes("bg-countdown-bg"),
    hasFontClass: sheets.includes("font-digital-numbers"), sheetCount: document.styleSheets.length,
  };
});
console.log(JSON.stringify({ status: res.status(), ...info }, null, 1));
await p.screenshot({ path: "plans/261009-1222-countdown-prelaunch-page/data/dev-3000.png" });
await b.close();
