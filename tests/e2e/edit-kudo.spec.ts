// Sửa Kudo (plans/261022-edit-kudo, MoMorph 419VXmMy6I): the pencil on a Kudo the viewer sent opens the Viết Kudo modal in edit
// mode, pre-filled; Lưu sends update_kudo and the card changes in place. Selector/text contract: support/edit-kudo-contract.ts.
// Fake: support/write-kudo-fixtures.mjs (update_kudo, kudo_detail read-back, seeded own Kudo). Runs on AUTHED (3103).
// A Kudo the viewer sent is seeded per test (/__kudo-seed-own) so every save is isolated; base fixtures only prove the pencil.
import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { KUDOS } from "./support/kudos-fixtures.mjs";
import { PROFILE, PROFILE_PATH, PROFILE_TXT } from "./support/profile-contract";
import { EDIT, UPDATE_RPC, counterText, markdownLength } from "./support/edit-kudo-contract";
import {
  KUDOS_FAKE, KUDOS_PATH, REQUIRED_MSG, SEL, WRITE, errorId, kudoLog, openWriteModal, rpcCalls, signInAs, writeDialog,
} from "./support/kudos-contract";
import { EDIT_SEED_CONTENT, EDIT_SEED_HASHTAGS, EDIT_SEED_RECIPIENT } from "./support/write-kudo-fixtures.mjs";

const AUTHED = process.env.E2E_AUTHED_URL || "http://localhost:3103";
const MENTION_ID = "2a000000-0000-0000-0000-000000000002"; // Nguyễn Thị Minh Anh, the mention inside EDIT_SEED_CONTENT
const NEW_TITLE = "ĐỒNG ĐỘI ĐÁNG TIN CẬY";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const newPhoto = () => ({ name: `new-${randomUUID()}.png`, mimeType: "image/png", buffer: PNG });
const nameOf = (url: string) => url.split("/").pop() as string;

type Seeded = { id: string; title: string; content: string; images: string[]; anonymous: boolean; alias: string | null; heartCount: number };
type Opts = { locale?: "en"; width?: number };

const cardOf = (page: Page, id: string) => page.locator(`[data-testid="${SEL.kudoCard}"][data-kudo-id="${id}"]`);
const pencilOf = (scope: Locator, locale: "vi" | "en" = "vi") => scope.getByRole("button", { name: EDIT.pencil[locale], exact: true });
const dialogOf = (page: Page, locale: "vi" | "en" = "vi") => page.getByRole("dialog", { name: EDIT.title[locale], exact: true });
const titleBox = (d: Locator, locale: "vi" | "en" = "vi") => d.getByRole("textbox", { name: locale === "en" ? /Title/ : /Danh hiệu/ });
const editor = (d: Locator) => d.getByTestId(WRITE.editor);
const chips = (d: Locator) => d.getByTestId(WRITE.hashtagChip);
const thumbs = (d: Locator) => d.getByTestId(WRITE.imageThumb);
const recipientOf = (d: Locator) => d.getByRole("combobox", { name: /Người nhận/ });
const anonBox = (d: Locator) => d.getByRole("checkbox", { name: "Gửi lời cám ơn và ghi nhận ẩn danh" });
const saveOf = (d: Locator, locale: "vi" | "en" = "vi") => d.getByRole("button", { name: EDIT.save[locale], exact: true });
const counterOf = (d: Locator) => d.getByTestId(EDIT.counterTestId);
const errorOf = (d: Locator, field: string) => d.getByTestId(errorId(field));
const blur = (d: Locator) => d.getByRole("heading").first().click(); // plain text moves focus out of any field
const cardTitle = (card: Locator) => card.getByTestId("kudo-title");

async function openAs(page: Page, request: APIRequestContext, path: string, sub: string, opts: Opts = {}) {
  await page.setViewportSize({ width: opts.width ?? 1440, height: 900 });
  await signInAs(page, request, sub);
  if (opts.locale) await page.context().addCookies([{ name: "NEXT_LOCALE", value: opts.locale, url: AUTHED }]);
  await page.goto(`${AUTHED}${path}`);
}

async function seed(request: APIRequestContext, sub: string, anonymous = false, alias?: string): Promise<Seeded> {
  const q = new URLSearchParams({ sub, ...(anonymous ? { anon: "1" } : {}), ...(alias !== undefined ? { alias } : {}) });
  const res = await request.get(`${KUDOS_FAKE}/__kudo-seed-own?${q}`);
  expect(res.ok()).toBe(true);
  return res.json();
}

/** Board, signed in as `sub` with one seeded own Kudo on top: opens its pencil and waits for the pre-filled title. */
async function openEditFromBoard(page: Page, request: APIRequestContext, opts: Opts & { anonymous?: boolean; alias?: string } = {}) {
  const sub = randomUUID();
  const seeded = await seed(request, sub, opts.anonymous, opts.alias);
  await openAs(page, request, KUDOS_PATH, sub, opts);
  const card = cardOf(page, seeded.id);
  await pencilOf(card, opts.locale ?? "vi").click();
  const dialog = dialogOf(page, opts.locale ?? "vi");
  await expect(dialog).toBeVisible();
  await expect(titleBox(dialog, opts.locale ?? "vi")).toHaveValue(seeded.title);
  return { sub, seeded, card, dialog };
}

const updates = async (request: APIRequestContext, sub: string) => rpcCalls(await kudoLog(request, sub), UPDATE_RPC);

/** Clicks Lưu and waits for the dialog to close (the success path); the caller then reads the log. */
async function saveAndClose(d: Locator) {
  await saveOf(d).click();
  await expect(d).toBeHidden();
}

test.describe("Sửa Kudo: lối vào bút chì", () => {
  test("bút chì chỉ có trên Kudo tôi gửi; bấm mở hộp thoại Chỉnh sửa bài viết của bạn", async ({ page, request }) => {
    const { seeded, dialog } = await openEditFromBoard(page, request);
    await expect(pencilOf(cardOf(page, seeded.id))).toHaveCount(1);
    await expect(pencilOf(cardOf(page, KUDOS[0].id))).toHaveCount(1); // base Kudo I sent (viewer -> p01)
    await expect(pencilOf(cardOf(page, KUDOS[1].id))).toHaveCount(0); // p02 -> me: someone else's Kudo
    await expect(page.getByRole("button", { name: EDIT.pencil.vi })).toHaveCount(2); // nothing else on the board
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: EDIT.title.vi })).toBeVisible();
  });

  test("the pencil is a 44px button: Tab-reachable, Enter opens the dialog", async ({ page, request }) => {
    const sub = randomUUID();
    const seeded = await seed(request, sub);
    await openAs(page, request, KUDOS_PATH, sub);
    const pencil = pencilOf(cardOf(page, seeded.id));
    const box = await pencil.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44, `pencil box ${JSON.stringify(box)}`).toBe(true);
    await pencil.focus();
    await page.keyboard.press("Enter");
    await expect(dialogOf(page)).toBeVisible();
  });

  test("Đã gửi on the profile: the pencil on each Kudo I sent, none on Đã nhận", async ({ page, request }) => {
    const sub = randomUUID();
    await openAs(page, request, PROFILE_PATH, sub);
    const section = page.getByTestId(PROFILE.kudos);
    await expect(section.getByRole("button", { name: EDIT.pencil.vi })).toHaveCount(0); // default direction: Đã nhận
    await page.getByTestId(PROFILE.kudosFilter).click();
    const sent = KUDOS.filter((k) => k.sender_key === "viewer").length;
    await page.getByRole("listbox").getByRole("option", { name: PROFILE_TXT.sent.vi(sent), exact: true }).click();
    await expect(section.getByRole("button", { name: EDIT.pencil.vi })).toHaveCount(sent);
    await section.getByRole("button", { name: EDIT.pencil.vi }).first().click();
    await expect(dialogOf(page)).toBeVisible();
  });
});

test.describe("Sửa Kudo: điền sẵn", () => {
  test("title, content with bold / italic / mention / link, hashtags, images in order; recipient and anonymous state locked", async ({ page, request }) => {
    const { seeded, dialog } = await openEditFromBoard(page, request);
    await expect(editor(dialog).locator("strong", { hasText: "bạn" })).toHaveCount(1);
    await expect(editor(dialog).locator("em", { hasText: "luôn" })).toHaveCount(1);
    await expect(editor(dialog).locator(`[data-type="mention"][data-id="${MENTION_ID}"]`)).toHaveText(/Nguyễn Thị Minh Anh/);
    await expect(editor(dialog).locator('a[href="https://example.com/guide"]')).toHaveText("tài liệu nội bộ");
    await expect(chips(dialog)).toHaveCount(EDIT_SEED_HASHTAGS.length); // wait for the render before reading the text
    const hashtags = (await chips(dialog).allTextContents()).join("|");
    expect(hashtags).toContain("Giỏi chuyên môn");
    expect(hashtags).toContain("Cống hiến");
    // thumbnails keep the saved order: each image's file name appears in the order of seeded.images
    await expect(thumbs(dialog)).toHaveCount(seeded.images.length);
    const srcs = (await thumbs(dialog).locator("img").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src") ?? "")))
      .map((s) => decodeURIComponent(s)).join("\n");
    const at = seeded.images.map((url) => srcs.indexOf(nameOf(url)));
    expect(at.every((i) => i >= 0), "every seeded image is shown").toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // recipient: the name, locked (disabled or read-only); typing opens no suggestions
    const recipient = recipientOf(dialog);
    await expect(recipient).toHaveValue(EDIT_SEED_RECIPIENT);
    expect(await recipient.evaluate((el) => (el as HTMLInputElement).disabled || (el as HTMLInputElement).readOnly)).toBe(true);
    await recipient.focus();
    await page.keyboard.type("Trần");
    await expect(recipient).toHaveValue(EDIT_SEED_RECIPIENT);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    // anonymous state: unchecked and locked (this Kudo is public); no alias field
    await expect(anonBox(dialog)).not.toBeChecked();
    await expect(anonBox(dialog)).toBeDisabled();
    await expect(dialog.getByRole("textbox", { name: EDIT.alias.vi })).toHaveCount(0);
  });

  test("anonymous Kudo: checkbox checked and locked, alias pre-filled; Lưu without a change sends the same alias", async ({ page, request }) => {
    const { sub, dialog } = await openEditFromBoard(page, request, { anonymous: true, alias: "Biệt danh cũ" });
    await expect(anonBox(dialog)).toBeChecked();
    await expect(anonBox(dialog)).toBeDisabled();
    await expect(dialog.getByRole("textbox", { name: EDIT.alias.vi })).toHaveValue("Biệt danh cũ");
    await saveAndClose(dialog);
    const [call] = await updates(request, sub);
    expect(call.p_anonymous_name).toBe("Biệt danh cũ");
  });
});

test.describe("Sửa Kudo: lưu", () => {
  test("title, content, one hashtag swapped, one image removed and one added: update_kudo gets them, the card changes in place", async ({ page, request }) => {
    const { sub, seeded, card, dialog } = await openEditFromBoard(page, request);
    const [a, b, c] = seeded.images;
    const timeBefore = await card.getByTestId("kudo-time").textContent();
    const heartsBefore = await card.getByTestId("kudo-hearts").getAttribute("aria-label");
    await page.evaluate(() => { (window as unknown as { __noReload?: number }).__noReload = 1; });

    await titleBox(dialog).fill(NEW_TITLE);
    await editor(dialog).click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" Thêm dòng mới.");
    await chips(dialog).filter({ hasText: "Giỏi chuyên môn" }).getByRole("button", { name: /Xóa/ }).click();
    await dialog.getByRole("button", { name: "+ Hashtag" }).click();
    await dialog.getByTestId(WRITE.hashtagDropdown).getByRole("option", { name: "Aim High" }).click();
    await blur(dialog);
    await thumbs(dialog).nth(1).getByRole("button", { name: /Xóa ảnh/ }).click();
    await dialog.getByTestId(WRITE.imageInput).setInputFiles(newPhoto());
    await expect(thumbs(dialog)).toHaveCount(3);
    await saveAndClose(dialog);
    await expect(page.getByRole("status").filter({ hasText: "Đã lưu thay đổi!" })).toBeVisible();

    const log = await kudoLog(request, sub);
    const [call] = rpcCalls(log, UPDATE_RPC);
    expect(call.p_id).toBe(seeded.id);
    expect(call.p_title).toBe(NEW_TITLE);
    expect(String(call.p_content)).toContain("Thêm dòng mới.");
    expect(String(call.p_content)).toContain("**bạn**");
    expect(String(call.p_content)).toContain(`@[Nguyễn Thị Minh Anh](${MENTION_ID})`);
    expect([...(call.p_hashtag_slugs as string[])].sort()).toEqual(["aim-high", "dedicated"]);
    const upload = log.uploads.at(-1)!;
    expect(call.p_image_urls).toEqual([a, c, expect.stringContaining(upload.path)]); // kept in order, then the new upload
    expect(call).not.toHaveProperty("p_recipient_id");
    expect(call).not.toHaveProperty("p_is_anonymous");
    expect(call.p_anonymous_name ?? null).toBeNull();

    // the card shows the saved values without a reload; time and hearts are the same as before
    expect(await page.evaluate(() => (window as unknown as { __noReload?: number }).__noReload)).toBe(1);
    await expect(cardTitle(card)).toHaveText(NEW_TITLE);
    await expect(card.getByTestId("kudo-content")).toContainText("Thêm dòng mới.");
    await expect(card.getByTestId("kudo-hashtag").filter({ hasText: "Aim High" })).toHaveCount(1);
    await expect(card.getByTestId("kudo-hashtag").filter({ hasText: "Giỏi chuyên môn" })).toHaveCount(0);
    await expect(card.getByTestId("kudo-image")).toHaveCount(3);
    await expect(card.locator(`img[src*="${upload.path}"]`)).toHaveCount(1);
    await expect(card.getByTestId("kudo-time")).toHaveText(timeBefore ?? "");
    await expect(card.getByTestId("kudo-hearts")).toHaveAttribute("aria-label", heartsBefore ?? "");

    // the removed image is deleted from Storage after the update succeeded
    await expect.poll(async () => (await kudoLog(request, sub)).deletes).toContain(nameOf(b));
    expect((await kudoLog(request, sub)).deletes).not.toContain(nameOf(a));
  });

  test("open then Lưu with no change: the Markdown content, title, hashtags and images reach update_kudo byte for byte", async ({ page, request }) => {
    const { sub, seeded, dialog } = await openEditFromBoard(page, request);
    await saveAndClose(dialog);
    const log = await kudoLog(request, sub);
    const [call] = rpcCalls(log, UPDATE_RPC);
    expect(call.p_content).toBe(EDIT_SEED_CONTENT);
    expect(call.p_title).toBe(seeded.title);
    expect([...(call.p_hashtag_slugs as string[])].sort()).toEqual([...EDIT_SEED_HASHTAGS].sort());
    expect(call.p_image_urls).toEqual(seeded.images);
    expect(log.uploads).toHaveLength(0);
    expect(log.deletes).toHaveLength(0);
  });

  const EMPTY_CASES = [
    { field: "title", clear: (d: Locator) => titleBox(d).fill("") },
    {
      field: "content",
      clear: async (d: Locator, page: Page) => {
        await editor(d).click();
        await page.keyboard.press("Control+A");
        await page.keyboard.press("Backspace");
      },
    },
    {
      field: "hashtags",
      clear: async (d: Locator) => {
        // Chips render only after the hashtag options load: wait for the seeded chips, or the loop sees none and clears nothing.
        await expect(chips(d)).toHaveCount(EDIT_SEED_HASHTAGS.length);
        while ((await chips(d).count()) > 0) await chips(d).first().getByRole("button", { name: /Xóa/ }).click();
      },
    },
  ] as const;
  for (const { field, clear } of EMPTY_CASES) {
    test(`Lưu disabled while ${field} is empty; leaving it shows the required line; nothing is sent`, async ({ page, request }) => {
      const { sub, dialog } = await openEditFromBoard(page, request);
      await clear(dialog, page);
      await expect(saveOf(dialog)).toBeDisabled();
      await blur(dialog);
      await expect(errorOf(dialog, field)).toContainText(REQUIRED_MSG);
      expect(await updates(request, sub)).toHaveLength(0);
    });
  }

  for (const [label, act] of [
    ["Hủy", (d: Locator) => d.getByRole("button", { name: EDIT.cancel, exact: true }).click()],
    ["Esc", (_d: Locator, page: Page) => page.keyboard.press("Escape")],
  ] as const) {
    test(`${label} discards the edit: reopening shows the saved values and no update_kudo was sent`, async ({ page, request }) => {
      const { sub, seeded, card, dialog } = await openEditFromBoard(page, request);
      await titleBox(dialog).fill("Tiêu đề sẽ bị bỏ");
      await act(dialog, page);
      await expect(dialog).toBeHidden();
      await pencilOf(card).click();
      await expect(titleBox(dialog)).toHaveValue(seeded.title);
      await expect(editor(dialog)).toContainText("nhé.");
      expect(await updates(request, sub)).toHaveLength(0);
    });
  }

  for (const [label, arm] of [
    ["not_found (the Kudo is not the caller's)", (request: APIRequestContext, sub: string) =>
      request.get(`${KUDOS_FAKE}/__kudo-refuse-update-once?sub=${sub}&code=not_found`)],
    ["a generic server failure", (request: APIRequestContext, sub: string) => request.get(`${KUDOS_FAKE}/__kudo-fail-update?sub=${sub}&on=1`)],
  ] as const) {
    test(`${label}: the generic line shows in the dialog, it stays open, the new upload is deleted and the removed image is kept`, async ({ page, request }) => {
      const { sub, seeded, card, dialog } = await openEditFromBoard(page, request);
      await arm(request, sub);
      await titleBox(dialog).fill("Tiêu đề lỗi");
      await thumbs(dialog).nth(1).getByRole("button", { name: /Xóa ảnh/ }).click();
      await dialog.getByTestId(WRITE.imageInput).setInputFiles(newPhoto());
      await saveOf(dialog).click();
      await expect(dialog.getByTestId(EDIT.genericErrorTestId)).toHaveText(EDIT.genericError.vi);
      await expect(dialog).toBeVisible();
      await expect(cardTitle(card)).toHaveText(seeded.title);
      const upload = (await kudoLog(request, sub)).uploads.at(-1)!;
      await expect.poll(async () => (await kudoLog(request, sub)).deletes).toContain(upload.path);
      expect((await kudoLog(request, sub)).deletes).not.toContain(nameOf(seeded.images[1]));
    });
  }
});

test.describe("Sửa Kudo: bộ đếm, ngôn ngữ, bố cục", () => {
  test("Viết Kudo counter: 0/5.000 when empty, then the typed Markdown length", async ({ page, request }) => {
    await openWriteModal(page, request);
    const d = writeDialog(page);
    await expect(counterOf(d)).toHaveText(counterText(0, "vi"));
    await editor(d).click();
    await editor(d).pressSequentially("Cảm ơn");
    await expect(counterOf(d)).toHaveText(counterText(6, "vi"));
  });

  test("Sửa counter: the saved Markdown length, and it follows the typing", async ({ page, request }) => {
    const { dialog } = await openEditFromBoard(page, request);
    const base = markdownLength(EDIT_SEED_CONTENT);
    await expect(counterOf(dialog)).toHaveText(counterText(base, "vi"));
    await editor(dialog).click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" xyz");
    await expect(counterOf(dialog)).toHaveText(counterText(base + 4, "vi"));
  });

  test("EN: 'Edit your Kudo', Lưu reads 'Save', the counter uses the comma (N/5,000)", async ({ page, request }) => {
    const { dialog } = await openEditFromBoard(page, request, { locale: "en" });
    await expect(dialog.getByRole("heading", { name: EDIT.title.en })).toBeVisible();
    await expect(saveOf(dialog, "en")).toBeVisible();
    await expect(counterOf(dialog)).toHaveText(counterText(markdownLength(EDIT_SEED_CONTENT), "en"));
  });

  test("375px: the edit dialog has no horizontal scroll", async ({ page, request }) => {
    const { dialog } = await openEditFromBoard(page, request, { width: 375 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await dialog.boundingBox();
    expect(box && box.width <= 375).toBe(true);
  });
});
