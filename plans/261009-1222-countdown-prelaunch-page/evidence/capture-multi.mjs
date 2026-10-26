// Capture /countdown at several viewports + a zoomed crop of the timer row at the design size.
import { chromium } from "@playwright/test";
import path from "node:path";

const out = process.argv[2];
const sizes = [[1512, 1077], [1920, 1080], [1440, 900]];
const browser = await chromium.launch();
for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto("http://localhost:3200/countdown", { waitUntil: "networkidle" });
  await page.getByTestId("countdown-minutes").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, `cmp-${w}x${h}.png`) });
  if (w === 1512) {
    await page.screenshot({ path: path.join(out, "cmp-crop-actual.png"), clip: { x: 400, y: 300, width: 712, height: 300 } });
  }
  await page.close();
}
await browser.close();
console.log("ok");
