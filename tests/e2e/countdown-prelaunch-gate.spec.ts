import { test, expect, Page } from "@playwright/test";

// Selector contract for Track A/B implementers:
// - heading: getByRole('heading', { name: 'Sự kiện sẽ bắt đầu sau' })
// - units: getByTestId('countdown-days' | 'countdown-hours' | 'countdown-minutes'), text = 2-digit value
// - labels: visible DAYS, HOURS, MINUTES (uppercase)

const E2E_FUTURE_TARGET_MS = parseInt(process.env.E2E_FUTURE_TARGET_MS || "0", 10);
const E2E_FUTURE_URL = process.env.E2E_FUTURE_URL || "http://localhost:3100";
const E2E_PAST_URL = process.env.E2E_PAST_URL || "http://localhost:3101";
const E2E_INVALID_URL = process.env.E2E_INVALID_URL || "http://localhost:3102";

function getExpectedCountdown(targetMs: number) {
  const remainingMs = Math.max(0, targetMs - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.min(99, Math.floor(totalSeconds / (24 * 60 * 60)));
  const hours = Math.min(23, Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60)));
  const minutes = Math.min(59, Math.floor((totalSeconds % (60 * 60)) / 60));
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
  };
}

async function assertUnitValue(page: Page, testId: string, expectedValue: string) {
  await expect.poll(
    async () => {
      const text = await page.getByTestId(testId).textContent();
      return text?.trim() === expectedValue ? expectedValue : null;
    },
    { timeout: 5000 }
  ).toBeTruthy();
}

test.describe("Countdown Prelaunch Gate", () => {
  test("test-1: routes before launch redirect to /countdown with 307", async ({ page }) => {
    const paths = ["/", "/login", "/does-not-exist"];
    for (const path of paths) {
      await page.goto(`${E2E_FUTURE_URL}${path}`, { waitUntil: "networkidle" });
      expect(new URL(page.url()).pathname).toBe("/countdown");
    }
  });

  test("test-2: static assets on /countdown return 200 (not gated)", async ({ page, request }) => {
    const resources: { type: string; url: string; status?: number }[] = [];

    page.on("response", (response) => {
      const url = response.url();
      if (url.includes(".css") || url.match(/\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf)(\?|$)/i)) {
        resources.push({ type: "asset", url, status: response.status() });
      }
    });

    await page.goto(`${E2E_FUTURE_URL}/countdown`, { waitUntil: "networkidle" });

    // Assert at least one stylesheet returned 200 and was not redirected
    const stylesheets = resources.filter((r) => r.url.includes(".css"));
    expect(stylesheets.length).toBeGreaterThan(0);
    stylesheets.forEach((s) => {
      expect(s.status).toBe(200);
      expect(s.url).not.toContain("/countdown");
    });

    // Assert the background image returns 200 when fetched directly
    const bgImageUrl = `${E2E_FUTURE_URL}/images/countdown/countdown-background.png`;
    const bgResponse = await request.get(bgImageUrl);
    expect(bgResponse.status()).toBe(200);
  });

  test("test-3: countdown units display correct computed values at assert time", async ({ page }) => {
    await page.goto(`${E2E_FUTURE_URL}/countdown`, { waitUntil: "networkidle" });
    const heading = page.getByRole("heading", { name: "Sự kiện sẽ bắt đầu sau" });
    await expect(heading).toBeVisible();

    const exp = getExpectedCountdown(E2E_FUTURE_TARGET_MS);
    await assertUnitValue(page, "countdown-days", exp.days);
    await assertUnitValue(page, "countdown-hours", exp.hours);
    await assertUnitValue(page, "countdown-minutes", exp.minutes);

    await expect(page.getByText("DAYS")).toBeVisible();
    await expect(page.getByText("HOURS")).toBeVisible();
    await expect(page.getByText("MINUTES")).toBeVisible();
  });

  test("test-4: countdown values identical with America/New_York timezone", async ({ browser }) => {
    const nyContext = await browser.newContext({ locale: "en-US", timezoneId: "America/New_York" });
    const page = await nyContext.newPage();
    await page.goto(`${E2E_FUTURE_URL}/countdown`, { waitUntil: "networkidle" });

    const exp = getExpectedCountdown(E2E_FUTURE_TARGET_MS);
    await assertUnitValue(page, "countdown-days", exp.days);
    await assertUnitValue(page, "countdown-hours", exp.hours);
    await assertUnitValue(page, "countdown-minutes", exp.minutes);
    await nyContext.close();
  });

  test("test-5: minutes decrease by one after fastForward 01:00", async ({ page }) => {
    await page.clock.install();
    await page.goto(`${E2E_FUTURE_URL}/countdown`, { waitUntil: "networkidle" });

    const minutesUnitBefore = page.getByTestId("countdown-minutes");
    const minutesBefore = await minutesUnitBefore.textContent();
    const minutesValueBefore = parseInt(minutesBefore?.trim() || "0", 10);

    await page.clock.fastForward("01:00");
    await page.waitForTimeout(500);

    const minutesAfter = await page.getByTestId("countdown-minutes").textContent();
    const minutesValueAfter = parseInt(minutesAfter?.trim() || "0", 10);
    const expectedDecrement = minutesValueBefore === 0 ? 59 : minutesValueBefore - 1;
    expect(minutesValueAfter).toBe(expectedDecrement);
  });

  test("test-6: fastForward past target triggers /login redirect", async ({ page }) => {
    await page.clock.install();
    await page.goto(`${E2E_FUTURE_URL}/countdown`, { waitUntil: "networkidle" });

    // FastForward to target - ~2s so remaining < 1 min, verify all 00 but NO /login request yet
    const remainingBeforeFf = E2E_FUTURE_TARGET_MS - Date.now();
    const ffAmount = remainingBeforeFf - 2000; // Leave ~2s
    await page.clock.fastForward(ffAmount);
    await page.waitForTimeout(500);

    await assertUnitValue(page, "countdown-days", "00");
    await assertUnitValue(page, "countdown-hours", "00");
    await assertUnitValue(page, "countdown-minutes", "00");

    // Now wait for /login request and fastForward to trigger it
    const loginRequestPromise = page.waitForRequest((req) => {
      const url = new URL(req.url());
      return url.pathname === "/login";
    });

    await page.clock.fastForward("05:00"); // 5 more seconds
    const loginRequest = await loginRequestPromise;
    expect(new URL(loginRequest.url()).pathname).toBe("/login");
  });

  test("test-7: past server redirects /countdown to /login, heading never rendered", async ({ page }) => {
    await page.goto(`${E2E_PAST_URL}/countdown`, { waitUntil: "networkidle" });
    expect(new URL(page.url()).pathname).toBe("/login");
    const heading = page.getByRole("heading", { name: "Sự kiện sẽ bắt đầu sau" });
    await expect(heading).not.toBeVisible();
  });

  test("test-8: invalid server root not redirected; /countdown ends at /login", async ({ page }) => {
    await page.goto(`${E2E_INVALID_URL}/`, { waitUntil: "networkidle" });
    expect(new URL(page.url()).pathname).not.toBe("/countdown");

    await page.goto(`${E2E_INVALID_URL}/countdown`, { waitUntil: "networkidle" });
    expect(new URL(page.url()).pathname).toBe("/login");
    const bodyText = await page.content();
    expect(bodyText).not.toContain("not-a-date");
  });
});
