// Viết Kudo: failure and boundary behaviour found by the 2026-10-20 review (phase-08: A5, A6, A7 + fix round 1). All on AUTHED (fake Supabase).
// Selector contract: support/kudos-contract.ts. Copy is VI (default locale); EN lives in messages/en/kudos-compose.ts.
import { test, expect, type Page } from "@playwright/test";
import {
  KUDOS_PATH, SEL, WRITE, delayHashtagCatalog, errorId, failHashtagCatalog, fillKudo, kudoLog, openAuthed, openWriteModal, recipientBox, refuseCreateRpcOnce,
  rpcCalls, sendButton, VALID_KUDO, writeDialog,
} from "./support/kudos-contract";
import { HASHTAGS } from "./support/kudos-fixtures.mjs";

const HASHTAG_LOAD_FAILED = "Không tải được danh sách hashtag";
const RETRY = "Thử lại";
const CONTENT_TOO_LONG = "Nội dung tối đa 5000 ký tự";
const CONTENT_MAX = 5000;
const RELOAD_HOLD_MS = 15_000; // a reload held this long is still pending when the test ends; the test never waits for it
const INVALID_MSG = "Giá trị không hợp lệ, vui lòng kiểm tra lại";
const editorOf = (page: Page) => writeDialog(page).getByTestId(WRITE.editor);
const hashtagTrigger = (page: Page) => writeDialog(page).getByRole("button", { name: "+ Hashtag" });
const hashtagDropdown = (page: Page) => writeDialog(page).getByTestId(WRITE.hashtagDropdown);

test.describe("A5 Esc in the hashtag dropdown closes the dropdown, never the modal", () => {
  test("focus on the '+ Hashtag' trigger (Shift+Tab from the first row), Esc: dropdown closes, modal and form values stay", async ({ page, request }) => {
    const sub = await openWriteModal(page, request);
    await fillKudo(page);
    await hashtagTrigger(page).click();
    await expect(hashtagDropdown(page)).toBeVisible();
    await expect(hashtagDropdown(page).getByRole("option").first()).toBeFocused(); // the dropdown moves focus to its first row
    await page.keyboard.press("Shift+Tab");
    await expect(hashtagTrigger(page)).toBeFocused();
    await expect(hashtagDropdown(page)).toBeVisible(); // still open: focus left the rows but not the picker

    await page.keyboard.press("Escape");
    await expect(hashtagDropdown(page)).toBeHidden();
    await expect(writeDialog(page)).toBeVisible(); // the same Esc must not reach the native dialog's cancel
    await expect(recipientBox(page)).toHaveValue(VALID_KUDO.recipient);
    await expect(writeDialog(page).getByRole("textbox", { name: /Danh hiệu/ })).toHaveValue(VALID_KUDO.title);
    await expect(editorOf(page)).toHaveText(VALID_KUDO.text);
    await expect(writeDialog(page).getByTestId(WRITE.hashtagChip)).toHaveCount(1);
    await expect(sendButton(page)).toBeEnabled();
    expect(rpcCalls(await kudoLog(request, sub), "create_kudo")).toHaveLength(0);

    await page.keyboard.press("Escape"); // nothing is open any more: now Esc closes the modal as usual
    await expect(writeDialog(page)).toBeHidden();
  });
});

test.describe("Round 1: a popup outside the modal never swallows the Esc that closes the modal", () => {
  test("filter dropdown left open behind the modal: one Esc closes the modal", async ({ page, request }) => {
    await openAuthed(page, request, KUDOS_PATH);
    const filter = page.getByRole("button", { name: "Hashtag", exact: true });
    await filter.click();
    await expect(filter).toHaveAttribute("aria-expanded", "true");
    await page.getByTestId(SEL.composeTrigger).focus(); // keyboard route: no pointer-down, so the dropdown is not dismissed
    await expect(filter).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(writeDialog(page)).toBeVisible();

    await page.keyboard.press("Escape"); // a single Esc: the dropdown behind the modal must not consume it
    await expect(writeDialog(page)).toBeHidden();
  });

  test("outside any modal the filter dropdown still closes on Esc and hands focus back to its button", async ({ page, request }) => {
    await openAuthed(page, request, KUDOS_PATH);
    const filter = page.getByRole("button", { name: "Hashtag", exact: true });
    await filter.click();
    await expect(filter).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(filter).toHaveAttribute("aria-expanded", "false");
    await expect(filter).toBeFocused();
  });
});

// Fix round 2: Esc is decided by the topmost open modal, not by the element that holds focus. With focus on <body> the old
// decision (popup's dialog vs the key target's dialog) went wrong both ways.
test.describe("Round 2: Esc with focus on <body> picks its owner by the topmost modal", () => {
  test("hashtag reload pending (the focused 'Thử lại' is gone, focus on body): Esc closes the dropdown only, the form survives", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    await failHashtagCatalog(request, sub, true); // before the modal opens: the form reads the catalog when it mounts
    await page.getByTestId(SEL.composeTrigger).click();
    await expect(writeDialog(page)).toBeVisible();
    await fillKudo(page, { tags: [] }); // the catalog is down, so no tag can be picked; the other fields hold the form to lose
    await hashtagTrigger(page).click();
    await expect(writeDialog(page).getByRole("alert").filter({ hasText: HASHTAG_LOAD_FAILED })).toBeVisible();

    await delayHashtagCatalog(request, sub, RELOAD_HOLD_MS); // the reload below stays pending for the whole test
    await writeDialog(page).getByRole("button", { name: RETRY, exact: true }).click();
    await expect(writeDialog(page).getByRole("button", { name: RETRY, exact: true })).toHaveCount(0); // panel swapped while loading
    await expect(hashtagDropdown(page)).toBeVisible();
    await expect(page.locator("body")).toBeFocused(); // the focused Retry button was unmounted: focus fell back to <body>

    await page.keyboard.press("Escape");
    await expect(hashtagDropdown(page)).toBeHidden();
    await expect(writeDialog(page)).toBeVisible(); // the same Esc must not reach the native dialog's cancel
    await expect(recipientBox(page)).toHaveValue(VALID_KUDO.recipient);
    await expect(writeDialog(page).getByRole("textbox", { name: /Danh hiệu/ })).toHaveValue(VALID_KUDO.title);
    await expect(editorOf(page)).toHaveText(VALID_KUDO.text);
    await expect(hashtagTrigger(page)).toBeFocused(); // a keyboard dismissal hands focus back to the trigger

    await page.keyboard.press("Escape"); // nothing is open any more: now Esc closes the modal as usual
    await expect(writeDialog(page)).toBeHidden();
  });

  test("filter dropdown left open behind the modal, focus on body: one Esc closes the modal", async ({ page, request }) => {
    await openAuthed(page, request, KUDOS_PATH);
    const filter = page.getByRole("button", { name: "Hashtag", exact: true });
    await filter.click();
    await expect(filter).toHaveAttribute("aria-expanded", "true");
    await page.getByTestId(SEL.composeTrigger).focus(); // keyboard route: no pointer-down, so the dropdown is not dismissed
    await page.keyboard.press("Enter");
    await expect(writeDialog(page)).toBeVisible();
    await expect(filter).toHaveAttribute("aria-expanded", "true");

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); // focus leaves the field, still inside the modal
    await expect(page.locator("body")).toBeFocused();
    await page.keyboard.press("Escape"); // body and the filter dropdown both sit outside any dialog, but the modal is the top layer
    await expect(writeDialog(page)).toBeHidden();
  });
});

test.describe("A6 hashtag catalog failure is explained and retryable", () => {
  test("a failed load shows an alert with 'Thử lại'; once the catalog is back, retry loads all tags", async ({ page, request }) => {
    const sub = await openAuthed(page, request, KUDOS_PATH);
    await failHashtagCatalog(request, sub, true); // before the modal opens: the form reads the catalog when it mounts
    await page.getByTestId(SEL.composeTrigger).click();
    await expect(writeDialog(page)).toBeVisible();
    await hashtagTrigger(page).click();

    const alert = writeDialog(page).getByRole("alert").filter({ hasText: HASHTAG_LOAD_FAILED });
    await expect(alert).toBeVisible();
    await expect(writeDialog(page).getByRole("button", { name: RETRY, exact: true })).toBeVisible();
    await expect(writeDialog(page).getByRole("option")).toHaveCount(0);
    await expect(sendButton(page)).toBeDisabled();

    // Retry while the catalog is still down: the failure shows again and focus returns to the (re-rendered) Retry button.
    const retry = writeDialog(page).getByRole("button", { name: RETRY, exact: true });
    await retry.evaluate((el) => el.setAttribute("data-stale", "")); // tells the old button from the one rendered after the failed reload
    await retry.click();
    await expect(writeDialog(page).locator("button:not([data-stale])", { hasText: RETRY })).toBeFocused();
    await expect(alert).toBeVisible();

    await failHashtagCatalog(request, sub, false);
    await retry.click();
    await expect(writeDialog(page).getByRole("option")).toHaveCount(HASHTAGS.length);
    await expect(writeDialog(page).getByRole("option").first()).toBeFocused(); // a successful reload hands focus to the first row
    await expect(alert).toHaveCount(0);
    await writeDialog(page).getByRole("option", { name: "Cống hiến" }).click();
    await expect(writeDialog(page).getByTestId(WRITE.hashtagChip)).toHaveCount(1);
  });
});

test.describe("A7 content longer than 5000 characters of Markdown", () => {
  test("shows the content error and keeps Gửi disabled (nothing sent); exactly 5000 is fine", async ({ page, request }) => {
    const sub = await openWriteModal(page, request);
    await fillKudo(page, { text: null }); // everything else valid, so only the length can block Gửi
    await editorOf(page).fill("a".repeat(CONTENT_MAX + 1)); // plain letters: Markdown length = text length

    await expect(writeDialog(page).getByTestId(errorId("content"))).toHaveText(CONTENT_TOO_LONG);
    await expect(sendButton(page)).toBeDisabled();
    await sendButton(page).click({ force: true, timeout: 1_000 }).catch(() => undefined); // a disabled button must not send
    expect(rpcCalls(await kudoLog(request, sub), "create_kudo")).toHaveLength(0);

    await editorOf(page).fill("a".repeat(CONTENT_MAX));
    await expect(writeDialog(page).getByTestId(errorId("content"))).toHaveCount(0);
    await expect(sendButton(page)).toBeEnabled();
  });
});

test.describe("Round 1: a field the server refuses says it is invalid, not empty", () => {
  for (const [code, field] of [
    ["invalid_recipient", "recipient"],
    ["invalid_title", "title"],
    ["invalid_content", "content"],
    ["invalid_hashtags", "hashtags"],
  ] as const) {
    test(`DB answers ${code} for a filled form: ${field} shows the invalid message, the modal stays, Gửi works again`, async ({ page, request }) => {
      const sub = await openWriteModal(page, request);
      await fillKudo(page);
      await refuseCreateRpcOnce(request, sub, code);
      await sendButton(page).click();

      const error = writeDialog(page).getByTestId(errorId(field));
      await expect(error).toHaveText(INVALID_MSG); // not "Không được để trống": the field is filled
      await expect(writeDialog(page)).toBeVisible();
      await expect(sendButton(page)).toBeEnabled();
      await expect(writeDialog(page).getByTestId(errorId("form"))).toHaveCount(0);
      expect(rpcCalls(await kudoLog(request, sub), "create_kudo")).toHaveLength(1);

      await sendButton(page).click(); // the refusal was one-shot and the message clears with the next try
      await expect(writeDialog(page)).toBeHidden();
      expect(rpcCalls(await kudoLog(request, sub), "create_kudo")).toHaveLength(2);
    });
  }
});
