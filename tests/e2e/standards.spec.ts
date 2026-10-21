import { expect, test, type Page } from "@playwright/test";
import { PAST, pathOf } from "./support/authed-session";
import { openAuthed, openWriteModal, writeDialog } from "./support/kudos-contract";

// Public page "Tiêu chuẩn chung" at /tieu-chuan-chung (Figma web 1161:8944, VI copy verbatim from
// plans/261021-community-standards/figma/standards-1161-8944-1440.png; clarifications.md = authoritative).
// Guest cases run on the PAST server (3101, no session). Signed-in cases run on the AUTHED server (3103).
// Contract: visually hidden h1 "Tiêu chuẩn chung"; h2 "Tiêu chuẩn cộng đồng" with a 10-item <ol>; h2
// "Tiêu chuẩn bảo mật" with a 2-item <ul> and the contact line; footer link carries aria-current="page" here only.
// EN asserts only the headings and item counts (the body is self-translated, not from Figma).

const STANDARDS_PATH = "/tieu-chuan-chung";
const PAGE_TITLE = "Tiêu chuẩn chung";
const H2_COMMUNITY = "Tiêu chuẩn cộng đồng";
const H2_SECURITY = "Tiêu chuẩn bảo mật";
const COMMUNITY_INTRO =
  "Tiêu chuẩn Cộng đồng (Community Standards) được xây dựng nhằm đảm bảo một môi trường văn minh, an toàn và tích cực cho tất cả thành viên tham gia phong trào ghi nhận, cảm ơn Sun* Kudos.";
const COMMUNITY_NOTICE =
  "Các nội dung phát hiện có một trong những tiêu chí vi phạm bên dưới sẽ được gắn nhãn Spam và được hệ thống chủ động ẩn.";
const COMMUNITY_RULES = [
  "Sử dụng từ ngữ thô tục, chửi bậy, hay có nội dung xúc phạm, bôi nhọ.",
  "Đề cập đến các vấn đề chính trị, tôn giáo, phân biệt giới tính.",
  "Chứa số liệu cụ thể (doanh thu, hợp đồng, KPI, khách hàng, mã dự án, số tài khoản…).",
  "Đề cập tên đối tác, khách hàng, tổ chức bên ngoài.",
  "Chứa thông tin cá nhân (email, số điện thoại, địa chỉ, thông tin gia đình).",
  "Gửi lặp lại 3+ tin nhắn có nội dung tương tự nhau trong thời gian ngắn.",
  "Nội dung Kudos quá ngắn (dưới 30 kí tự), không có ngữ cảnh (“Cảm ơn nhiều”, “Thanks nhé”, “Good job!”).",
  "Gửi cho quá nhiều người/nhóm người trong thời gian ngắn (<3s/lời nhắn).",
  'Ngôn từ spam (chỉ chứa ký tự như ".", ",", "...", hay ký tự không có nội dung).',
  "Mức độ “tim” tăng đột biến bất thường (theo hành vi người dùng trung bình).",
];
const SECURITY_STATEMENT =
  "Sunner cam kết bảo vệ thông tin. Mọi thành viên có trách nhiệm bảo mật nội dung chia sẻ trên hệ thống.";
const SECURITY_ITEMS = [
  "Bảo mật Thông tin: Toàn bộ thông tin Sunner chia sẻ sẽ được bảo mật trên hệ thống.",
  "Phạm vi Chia sẻ: Toàn bộ thông tin nhân sự và dự án trong hệ thống được bảo mật. Sunner vui lòng chỉ chia sẻ trong nội bộ Sun*.",
];
const SECURITY_CONTACT =
  "Liên hệ Hỗ trợ: Mọi thắc mắc, Sunner vui lòng liên hệ đại diện BTC SAA: Slack duong.thi.thuy.an để được hỗ trợ.";
const EN_COMMUNITY_H2 = "Community Standards";
const EN_PAGE_TITLE = "General standards";

const main = (page: Page) => page.locator("main");
const pageHeading = (page: Page, name: string = PAGE_TITLE) => page.getByRole("heading", { level: 1, name, exact: true });
const sectionHeading = (page: Page, name: string) => page.getByRole("heading", { level: 2, name, exact: true });
const footerLink = (page: Page, name: string) => page.getByRole("contentinfo").getByRole("link", { name, exact: true });
const FOOTER_NAMES = ["About SAA 2025", "Awards Information", "Sun* Kudos", PAGE_TITLE] as const;

async function openStandardsGuest(page: Page) {
  const response = await page.goto(`${PAST}${STANDARDS_PATH}`);
  expect(response?.status(), "GET /tieu-chuan-chung is a public 200").toBe(200);
  expect(pathOf(page), "guest must not be redirected to /login").toBe(STANDARDS_PATH);
}

test.describe("Tiêu chuẩn chung: guest access", () => {
  test("anonymous GET /tieu-chuan-chung: 200, stays on the page, header shows the login link", async ({ page }) => {
    await openStandardsGuest(page);
    const login = page.getByRole("banner").getByRole("link", { name: "Đăng nhập", exact: true });
    await expect(login).toBeVisible();
    await expect(login).toHaveAttribute("href", "/login");
    await expect(pageHeading(page)).toHaveCount(1);
  });

  test("signed-in user also opens /tieu-chuan-chung", async ({ page, request }) => {
    await openAuthed(page, request, STANDARDS_PATH);
    expect(pathOf(page)).toBe(STANDARDS_PATH);
    await expect(sectionHeading(page, H2_COMMUNITY)).toBeVisible();
  });
});

test.describe("Tiêu chuẩn chung: content (VI)", () => {
  test("document title and visually hidden h1, keyvisual logo, both section headings", async ({ page }) => {
    await openStandardsGuest(page);
    await expect(page).toHaveTitle(/Tiêu chuẩn chung/);
    await expect(pageHeading(page)).toHaveCount(1);
    await expect(main(page).getByRole("img", { name: "ROOT FURTHER", exact: true })).toBeVisible();
    await expect(sectionHeading(page, H2_COMMUNITY)).toBeVisible();
    await expect(sectionHeading(page, H2_SECURITY)).toBeVisible();
  });

  test("community standards: gold intro, white notice and an <ol> of exactly 10 items in order", async ({ page }) => {
    await openStandardsGuest(page);
    await expect(main(page).getByText(COMMUNITY_INTRO, { exact: true })).toBeVisible();
    await expect(main(page).getByText(COMMUNITY_NOTICE, { exact: true })).toBeVisible();
    const list = main(page).locator("ol");
    await expect(list).toHaveCount(1);
    await expect(list.locator("> li")).toHaveText(COMMUNITY_RULES);
  });

  test("security standards: statement, <ul> of exactly 2 items and the contact line", async ({ page }) => {
    await openStandardsGuest(page);
    await expect(main(page).getByText(SECURITY_STATEMENT, { exact: true })).toBeVisible();
    const list = main(page).locator("ul");
    await expect(list).toHaveCount(1);
    await expect(list.locator("> li")).toHaveText(SECURITY_ITEMS);
    await expect(main(page).getByText(SECURITY_CONTACT, { exact: true })).toBeVisible();
  });
});

test.describe("Tiêu chuẩn chung: footer and entry points", () => {
  test("footer 'Tiêu chuẩn chung' is aria-current on this page; other footer links carry none", async ({ page }) => {
    await openStandardsGuest(page);
    await expect(footerLink(page, PAGE_TITLE)).toHaveAttribute("aria-current", "page");
    for (const name of FOOTER_NAMES.slice(0, 3)) {
      await expect(footerLink(page, name)).not.toHaveAttribute("aria-current", "page");
    }
  });

  test("homepage footer has no aria-current; clicking it lands on /tieu-chuan-chung and marks it current", async ({ page }) => {
    await page.goto(`${PAST}/`);
    expect(pathOf(page)).toBe("/");
    await expect(footerLink(page, PAGE_TITLE)).not.toHaveAttribute("aria-current", "page");
    await footerLink(page, PAGE_TITLE).click();
    await expect(page).toHaveURL(/\/tieu-chuan-chung$/);
    await expect(footerLink(page, PAGE_TITLE)).toHaveAttribute("aria-current", "page");
    await expect(sectionHeading(page, H2_COMMUNITY)).toBeVisible();
  });

  test("Viết Kudo toolbar 'Tiêu chuẩn cộng đồng' opens the page in a new tab; the modal stays open", async ({ page, request, context }) => {
    await openWriteModal(page, request);
    const link = writeDialog(page).getByRole("link", { name: "Tiêu chuẩn cộng đồng", exact: true });
    await expect(link).toHaveAttribute("href", STANDARDS_PATH);
    const [popup] = await Promise.all([context.waitForEvent("page"), link.click()]);
    await popup.waitForLoadState();
    expect(pathOf(popup)).toBe(STANDARDS_PATH);
    await expect(popup.getByRole("heading", { level: 2, name: H2_COMMUNITY, exact: true })).toBeVisible();
    await expect(writeDialog(page), "the original tab keeps the Viết Kudo modal open").toBeVisible();
  });
});

test.describe("Tiêu chuẩn chung: English", () => {
  test("EN switch shows the English headings and the same item counts", async ({ page }) => {
    await openStandardsGuest(page);
    await page.getByTestId("language-selector").click();
    await page.getByRole("listbox").getByRole("option", { name: "EN", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(sectionHeading(page, EN_COMMUNITY_H2)).toBeVisible();
    await expect(pageHeading(page, EN_PAGE_TITLE)).toHaveCount(1);
    await expect(main(page).locator("ol > li")).toHaveCount(10);
    await expect(main(page).locator("ul > li")).toHaveCount(2);
  });
});

test.describe("Tiêu chuẩn chung: mobile", () => {
  test("375px wide: no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openStandardsGuest(page);
    await expect(sectionHeading(page, H2_SECURITY)).toBeVisible();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.scrollingElement!.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(metrics.scrollWidth, "document must not scroll sideways").toBeLessThanOrEqual(metrics.innerWidth);
  });
});
