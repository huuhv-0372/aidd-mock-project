import { defineConfig, devices } from "@playwright/test";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SECOND_MS = 1000;
const ICT_OFFSET_MS = 7 * HOUR_MS;

// Format an epoch as ISO-8601 in UTC+7 with an explicit "+07:00" offset (not "Z").
function toIctIso(epochMs: number): string {
  const shifted = new Date(epochMs + ICT_OFFSET_MS).toISOString().slice(0, 19);
  return `${shifted}+07:00`;
}

// Future target: now + 2d 3h 4m 30s. Workers re-import this config later, so reuse the
// value the main process already exported instead of recomputing (keeps spec and server in sync).
const futureTargetMs = process.env.E2E_FUTURE_TARGET_MS
  ? Number(process.env.E2E_FUTURE_TARGET_MS)
  : Date.now() + 2 * DAY_MS + 3 * HOUR_MS + 4 * MINUTE_MS + 30 * SECOND_MS;

const servers = [
  { name: "future", port: 3100, eventStartAt: toIctIso(futureTargetMs) },
  { name: "past", port: 3101, eventStartAt: "2020-01-01T00:00:00+07:00" },
  { name: "invalid", port: 3102, eventStartAt: "not-a-date" },
] as const;

// Export for the spec (loaded in the same process / inherited by workers).
process.env.E2E_FUTURE_TARGET_MS = String(futureTargetMs);
process.env.E2E_FUTURE_URL = "http://localhost:3100";
process.env.E2E_PAST_URL = "http://localhost:3101";
process.env.E2E_INVALID_URL = "http://localhost:3102";
process.env.E2E_SUPABASE_URL = "http://127.0.0.1:54399";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Requires a prior `next build` (see the `test:e2e` script).
  webServer: servers.map(({ port, eventStartAt }) => ({
    command: `npx next start -p ${port}`,
    // Health-check a static file: `/` is gated by proxy.ts on the "future" server and would never be ready.
    url: `http://localhost:${port}/favicon.ico`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      EVENT_START_AT: eventStartAt,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54399",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e2e_fake",
    },
  })),
});
