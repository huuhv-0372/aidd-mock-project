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

// Awards ceremony target for the authed server: now + 2d 3h 4m 30s, computed once and re-exported
// (same worker-sync reason as above) so homepage.spec.ts can derive the expected countdown.
const awardsCeremonyMs = process.env.E2E_AWARDS_CEREMONY_AT_MS
  ? Number(process.env.E2E_AWARDS_CEREMONY_AT_MS)
  : Date.now() + 2 * DAY_MS + 3 * HOUR_MS + 4 * MINUTE_MS + 30 * SECOND_MS;

const servers = [
  { name: "future", port: 3100, eventStartAt: toIctIso(futureTargetMs) },
  { name: "past", port: 3101, eventStartAt: "2020-01-01T00:00:00+07:00" },
  { name: "invalid", port: 3102, eventStartAt: "not-a-date" },
] as const;

// Export for the spec (loaded in the same process / inherited by workers).
process.env.E2E_FUTURE_TARGET_MS = String(futureTargetMs);
process.env.E2E_AWARDS_CEREMONY_AT_MS = String(awardsCeremonyMs);
process.env.E2E_FUTURE_URL = "http://localhost:3100";
process.env.E2E_PAST_URL = "http://localhost:3101";
process.env.E2E_INVALID_URL = "http://localhost:3102";
process.env.E2E_SUPABASE_URL = "http://127.0.0.1:54399";
// Test-only fake Supabase (tests/e2e/support/fake-supabase-server.mjs) for the "authed" server.
const FAKE_SUPABASE_URL = "http://127.0.0.1:54398";
process.env.E2E_AUTHED_URL = "http://localhost:3103";
process.env.E2E_FAKE_SUPABASE_URL = FAKE_SUPABASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Requires a prior `next build` (see the `test:e2e` script).
  webServer: [
    {
      command: "node tests/e2e/support/fake-supabase-server.mjs",
      url: `${FAKE_SUPABASE_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    ...servers.map(({ port, eventStartAt }) => ({
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
    {
      // Authed server: launched event, Supabase -> the fake (real getClaims() verifies its JWKS).
      command: "npx next start -p 3103",
      url: "http://localhost:3103/favicon.ico",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        EVENT_START_AT: "2020-01-01T00:00:00+07:00",
        AWARDS_CEREMONY_AT: toIctIso(awardsCeremonyMs),
        NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e2e_fake",
      },
    },
  ],
});
