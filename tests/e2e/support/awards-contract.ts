import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { AUTHED, pathOf, signIn } from "./authed-session";

// Awards Information (MoMorph zFYDgyj_pD) expectations shared by the awards E2E specs.
// Values come from plans/momorph-specs/he-thong-giai-zFYDgyj_pD/specs.csv. Quantity/prize regexes assert the
// numeric part so Figma copy ("10 Cá nhân", "7.000.000 VNĐ") can differ in wording without a false RED.

export const AWARD_PATH = "/awards-information";
export const H1 = "Hệ thống giải thưởng SAA 2025";

export interface AwardExpectation {
  slug: string;
  label: string; // nav item label
  title: string; // card h2
  quantity: RegExp;
  prizes: RegExp[]; // one per award-prize element, in order
}

export const AWARDS: AwardExpectation[] = [
  { slug: "top-talent", label: "Top Talent", title: "Top Talent",
    quantity: /\b10\s*Cá nhân/, prizes: [/7[.,]000[.,]000\s*VNĐ/] },
  { slug: "top-project", label: "Top Project", title: "Top Project",
    quantity: /\b02\s*Tập thể/, prizes: [/15[.,]000[.,]000\s*VNĐ/] },
  { slug: "top-project-leader", label: "Top Project Leader", title: "Top Project Leader",
    quantity: /\b03\s*Cá nhân/, prizes: [/7[.,]000[.,]000\s*VNĐ/] },
  { slug: "best-manager", label: "Best Manager", title: "Best Manager",
    quantity: /\b01\s*Cá nhân/, prizes: [/10[.,]000[.,]000\s*VNĐ/] },
  { slug: "signature-2025-creator", label: "Signature 2025 - Creator", title: "Signature 2025 - Creator",
    quantity: /\b01\b/, prizes: [/5[.,]000[.,]000\s*VNĐ/, /8[.,]000[.,]000\s*VNĐ/] },
  { slug: "mvp", label: "MVP", title: "MVP (Most Valuable Person)",
    quantity: /\b01\b/, prizes: [/15[.,]000[.,]000\s*VNĐ/] },
];

export const NAV_LABELS = AWARDS.map((a) => a.label);

/** Slugs of nav items currently marked aria-current="true" (contract: exactly one when active). */
export const activeSlugs = (page: Page) =>
  page.getByTestId("awards-nav-item").evaluateAll((els) =>
    els
      .filter((el) => el.getAttribute("aria-current") === "true")
      .map((el) => (el.getAttribute("href") ?? "").replace(/^#/, "")),
  );

/** Document-relative top of an element (stable across scroll position). */
export const docTop = (loc: Locator) => loc.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

export const cardLocator = (page: Page, slug: string) =>
  page.locator(`[data-testid="award-section"][id="${slug}"]`);

/** Signs in on the authed server and opens the awards page; asserts the URL only (content is the test's job). */
export async function openAwards(
  page: Page,
  request: APIRequestContext,
  opts: { width?: number; height?: number; hash?: string } = {},
): Promise<void> {
  const { width = 1440, height = 900, hash = "" } = opts;
  await page.setViewportSize({ width, height });
  await signIn(page, request);
  await page.goto(`${AUTHED}${AWARD_PATH}${hash}`);
  expect(pathOf(page)).toBe(AWARD_PATH);
}
