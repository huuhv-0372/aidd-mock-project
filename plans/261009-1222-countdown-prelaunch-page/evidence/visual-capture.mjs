// Visual capture for SCR001 countdown. Fails loudly if the page did not render the countdown.
// Usage: node visual-capture.mjs (server on :3200 with EVENT_START_AT ≈ now + 5h20m30s).
import { chromium } from "@playwright/test";
import path from "node:path";

const baseUrl = "http://localhost:3200";
const outDir = path.resolve(import.meta.dirname, "../data");
const viewports = [
  { w: 1512, h: 1077, file: "actual.png" },
  { w: 768, h: 1024, file: "actual-768.png" },
  { w: 375, h: 812, file: "actual-375.png" },
];

const browser = await chromium.launch();
try {
  for (const { w, h, file } of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const res = await page.goto(`${baseUrl}/countdown`, { waitUntil: "networkidle" });
    const pathname = new URL(page.url()).pathname;
    await page.getByRole("heading", { name: "Sự kiện sẽ bắt đầu sau" }).waitFor({ timeout: 10_000 });
    await page.getByTestId("countdown-minutes").waitFor({ timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
      const units = ["days", "hours", "minutes"].map((u) => {
        const r = document.querySelector(`[data-testid="countdown-${u}"]`).getBoundingClientRect();
        return { u, top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right) };
      });
      const labels = [...document.querySelectorAll("span")]
        .filter((s) => ["DAYS", "HOURS", "MINUTES"].includes(s.textContent.trim()))
        .map((s) => { const r = s.getBoundingClientRect(); return { t: s.textContent.trim(), left: Math.round(r.left), right: Math.round(r.right), sw: s.scrollWidth, cw: s.clientWidth }; });
      const h1 = document.querySelector("h1").getBoundingClientRect();
      const fonts = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
      return { scrollWidth: document.documentElement.scrollWidth, units, labels, h1Top: Math.round(h1.top), fonts };
    });
    await page.screenshot({ path: path.join(outDir, file) });
    const oneRow = new Set(metrics.units.map((u) => u.top)).size === 1;
    console.log(JSON.stringify({ viewport: `${w}x${h}`, status: res.status(), pathname, oneRow, overflow: metrics.scrollWidth > w, ...metrics }));
    await page.close();
  }
} finally {
  await browser.close();
}
