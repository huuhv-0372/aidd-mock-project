// Viết Kudo modal (MoMorph ihQ26W78P2) + Add link (OyDLDuSGEa), feature #12. Selector contract: support/kudos-contract.ts
// (WRITE, TOOLBAR, errorId, helpers). Test cases: viet-kudo-ihQ26W78P2 (ID-n), addlink-box-OyDLDuSGEa (by name).
// All cases run on AUTHED (3103, fake Supabase). The fake mirrors the phase-02 SQL (write-kudo-fixtures.mjs) and records what the
// app really sent (RPC bodies, Storage uploads/deletes) per signed-in user; tests read it with kudoLog().
// Decisions (clarifications.md): Gửi is DISABLED until Người nhận + Danh hiệu + nội dung + >=1 Hashtag are set, so the
// "required" errors (ID-7/11/14/50-52) appear on blur; hashtags come only from the 13 catalog tags; success closes the modal.
// Deferred (reason): ID-56 (contradicts the disabled Gửi decision), ID-1 (covered in kudos-quick-actions.spec.ts guest case),
// hover/visual states -> phase 06. Free-form tags (ID-34 "TeamWork") are N/A: only catalog tags exist.
import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  ADD_LINK, REQUIRED_MSG, SEL, TOOLBAR, WRITE, addLinkDialog, delayCreateRpc, delaySearchRpc, dialogHeading, errorId, failCreateRpc,
  fillKudo, kudoLog, openAuthed, openWidgetMenu, openWriteModal, pickHashtags, recipientBox, rpcCalls, sendButton, VALID_KUDO, widgetMenu,
  writeDialog, type KudoForm,
} from "./support/kudos-contract";
import { sunnerEmail, sunnerIdByName } from "./support/write-kudo-fixtures.mjs";

const NO_RESULT_MSG = "Không tìm thấy Sunner phù hợp";
const PICK_FROM_LIST_MSG = "Hãy chọn người nhận trong danh sách gợi ý";
const ANON = "Gửi lời cám ơn và ghi nhận ẩn danh";
const AN_ID = sunnerIdByName("Nguyễn Văn An")!;
const fold = (s: string) => s.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/\p{M}/gu, "");
const editorOf = (page: Page) => writeDialog(page).getByTestId(WRITE.editor);
const chipsOf = (page: Page) => writeDialog(page).getByTestId(WRITE.hashtagChip);
const thumbsOf = (page: Page) => writeDialog(page).getByTestId(WRITE.imageThumb);
const addImageBtn = (page: Page) => writeDialog(page).getByRole("button", { name: "+ Image" });
const errorOf = (page: Page, field: string) => writeDialog(page).getByTestId(errorId(field));
const noResult = (page: Page) => writeDialog(page).getByRole("status").filter({ hasText: NO_RESULT_MSG });
const top = (l: Locator) => l.evaluate((el) => el.getBoundingClientRect().top);

// Small real files built in-test: correct magic bytes (jpg FF D8 FF, png 89 50 4E 47, webp RIFF..WEBP) or wrong ones.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
// The server walks the JPEG header to strip Exif, so the JPG needs real structure: SOI, APP0 (JFIF), SOS, scan bytes, EOI.
const JPG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from("JFIF\0"), Buffer.from([1, 1, 0, 0, 1, 0, 1, 0, 0]),
  Buffer.from([0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0]), Buffer.alloc(64, 7), Buffer.from([0xff, 0xd9]),
]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(32, 3)]);
const file = (name: string, mimeType: string, buffer: Buffer) => ({ name, mimeType, buffer });
// Unique name + size per photo, so a UI that de-duplicates by name/size still sees distinct files.
let photoSeq = 0;
const photos = (n: number) => Array.from({ length: n }, () => {
  photoSeq += 1;
  return file(`photo-${photoSeq}.jpg`, "image/jpeg", Buffer.concat([JPG, Buffer.alloc(photoSeq)]));
});
const attach = (page: Page, files: ReturnType<typeof file>[]) => writeDialog(page).getByTestId(WRITE.imageInput).setInputFiles(files);
const blurTo = (page: Page) => dialogHeading(page).click(); // click on plain text moves focus out of any field
/** The answer (headers) of the Sunner-search server action whose arguments contain `query`; start it BEFORE the action that triggers it. */
const searchAnswered = (page: Page, query: string) => page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes(query));
/** Lets the client apply an answer that just arrived, so "nothing appeared" is judged after the app had its chance to show it. */
const flushUi = (page: Page) => page.evaluate(() => new Promise<void>((done) => setTimeout(done, 150)));

const createCalls = async (request: Parameters<typeof kudoLog>[0], sub: string) => rpcCalls(await kudoLog(request, sub), "create_kudo");
const sunnerSearches = async (request: Parameters<typeof kudoLog>[0], sub: string) => rpcCalls(await kudoLog(request, sub), "kudos_search_sunners");

test.describe("Viết Kudo: layout and defaults", () => {
  let sub = "";
  test.beforeEach(async ({ page, request }) => {
    sub = await openWriteModal(page, request);
  });

  test("ID-3 title on top; fields run Người nhận, editor, Hashtag, Image, anonymous checkbox; Hủy + Gửi bottom right", async ({ page }) => {
    const dialog = writeDialog(page);
    await expect(dialogHeading(page)).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: /Danh hiệu/ })).toBeVisible();
    const order = [
      recipientBox(page), editorOf(page), dialog.getByRole("button", { name: "+ Hashtag" }), addImageBtn(page),
      dialog.getByRole("checkbox", { name: ANON }),
    ];
    const tops: number[] = [await top(dialogHeading(page))];
    for (const field of order) {
      await expect(field).toBeVisible();
      tops.push(await top(field));
    }
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    const box = (await dialog.boundingBox())!;
    const send = (await sendButton(page).boundingBox())!;
    const cancel = (await dialog.getByRole("button", { name: "Hủy", exact: true }).boundingBox())!;
    expect(cancel.x).toBeLessThan(send.x);
    expect(send.x + send.width).toBeGreaterThan(box.x + box.width * 0.75);
    expect(send.y).toBeGreaterThan(tops.at(-1)!);
  });

  test("ID-4, ID-5, ID-6, ID-48 placeholders, anonymous unchecked with no alias field, Gửi disabled", async ({ page }) => {
    const dialog = writeDialog(page);
    await expect(recipientBox(page)).toHaveAttribute("placeholder", WRITE.placeholder.recipient);
    await expect(editorOf(page).locator("p[data-placeholder]").first()).toHaveAttribute("data-placeholder", WRITE.placeholder.editor);
    await expect(dialog.getByRole("checkbox", { name: ANON })).not.toBeChecked();
    await expect(dialog.getByRole("textbox", { name: "Tên ẩn danh" })).toHaveCount(0);
    await expect(sendButton(page)).toBeDisabled();
  });

  test("ID-49 Gửi enables once recipient, title, content and 1 hashtag are set", async ({ page }) => {
    await fillKudo(page);
    await expect(sendButton(page)).toBeEnabled();
  });

  const MISSING: [string, KudoForm][] = [
    ["recipient", { recipient: null }], ["title", { title: null }], ["content", { text: null }], ["hashtag", { tags: [] }],
  ];
  for (const [missing, form] of MISSING) {
    test(`ID-48 Gửi stays disabled without ${missing}; nothing is sent`, async ({ page, request }) => {
      await fillKudo(page, form);
      await expect(sendButton(page)).toBeDisabled();
      expect(await createCalls(request, sub)).toHaveLength(0);
    });
  }
});

test.describe("Viết Kudo: Người nhận", () => {
  let sub = "";
  test.beforeEach(async ({ page, request }) => {
    sub = await openWriteModal(page, request);
  });
  const options = (page: Page) => writeDialog(page).getByRole("option");
  const optionNames = (page: Page) => options(page).getByTestId(WRITE.recipientName);

  test("ID-8, ID-25 typing filters Sunners ignoring accents; suggestions carry no email", async ({ page }) => {
    await recipientBox(page).fill("Nguyễn");
    await expect(options(page).first()).toBeVisible();
    for (const text of await options(page).allTextContents()) {
      expect(fold(text)).toContain("nguyen");
      expect(text).not.toContain("@");
    }
    await recipientBox(page).fill("nguyen"); // no accent still matches "Nguyễn"
    await expect(options(page).filter({ hasText: "Nguyễn Văn An" })).toHaveCount(1);
    await recipientBox(page).fill("An");
    await expect(options(page).first()).toBeVisible();
    for (const text of await options(page).allTextContents()) expect(fold(text)).toContain("an");
  });

  test("ID-9 '@ # $' is searched by name ('# $') and matches nobody: no suggestions, no crash", async ({ page, request }) => {
    await recipientBox(page).fill("@ # $");
    await expect(noResult(page)).toBeVisible(); // the answer arrived and was handled: only now is "no options" meaningful
    await expect(options(page)).toHaveCount(0);
    await expect(writeDialog(page).getByRole("listbox")).toHaveCount(0);
    expect((await sunnerSearches(request, sub)).at(-1)).toMatchObject({ p_query: "# $", p_name_only: true });
    await expect(writeDialog(page)).toBeVisible();
  });

  test("ID-10 surrounding spaces are trimmed before searching", async ({ page, request }) => {
    await recipientBox(page).fill("  Nguyễn  ");
    await expect(options(page).first()).toBeVisible();
    const queries = (await sunnerSearches(request, sub)).map((b) => b.p_query);
    expect(queries.at(-1)).toBe("Nguyễn");
  });

  // The fake puts the caller ("E2E User", e2e@...) in the searchable domain and drops it like the SQL (`p.id <> v_uid`), so a
  // missing exclusion in what the app sends or shows fails here. The SQL verify against a real database remains the real proof.
  test("results cap at 10; the signed-in user is never suggested, not even by name or email", async ({ page, request }) => {
    await recipientBox(page).fill("tester"); // fixture has 12 "Sunner Tester NN"
    await expect(options(page)).toHaveCount(10);
    for (const query of ["e2e", "e2e@sun-asterisk.com"]) { // name and email of the caller: nobody else matches
      await recipientBox(page).fill(query);
      await expect(noResult(page)).toBeVisible(); // answered, and the answer had nobody to show
      await expect(options(page)).toHaveCount(0);
      expect((await sunnerSearches(request, sub)).at(-1)?.p_query).toBe(query);
    }
  });

  // Issue #17: a row showed the name only; the design (frame QIMJNgFb8K) has the avatar, the name and the department below it.
  test("each suggestion shows the avatar, the name and the department", async ({ page }) => {
    await recipientBox(page).fill("@Văn An");
    await expect(optionNames(page)).toHaveText(["Nguyễn Văn An", "Trần Văn An"]);
    await expect(options(page).getByTestId(WRITE.recipientDepartment)).toHaveText(["CEVC1", "STVC"]);
    await expect(options(page).getByTestId(WRITE.recipientAvatar)).toHaveCount(2);
    for (const avatar of await options(page).getByTestId(WRITE.recipientAvatar).all()) {
      expect(await avatar.evaluate((el) => el.getBoundingClientRect().width)).toBe(40);
    }
  });

  test("ID-26 choosing a suggestion fills the field and closes the list", async ({ page }) => {
    await recipientBox(page).fill("Nguyễn Văn An"); // "An" alone has 19 matches; the list is cut to 10 alphabetically
    await writeDialog(page).getByRole("option", { name: "Nguyễn Văn An" }).click();
    await expect(recipientBox(page)).toHaveValue("Nguyễn Văn An");
    await expect(options(page)).toHaveCount(0);
  });

  test("ID-7, ID-50 leaving Người nhận empty shows the red field and 'Không được để trống'; Gửi stays disabled", async ({ page, request }) => {
    await recipientBox(page).focus();
    await blurTo(page);
    await expect(recipientBox(page)).toHaveAttribute("aria-invalid", "true");
    await expect(errorOf(page, "recipient")).toContainText(REQUIRED_MSG);
    await expect(sendButton(page)).toBeDisabled();
    expect(await createCalls(request, sub)).toHaveLength(0);
  });

  // Search by name AND email (live-test bug: a pasted colleague email found nothing, Gửi stayed disabled, and the field said
  // "empty" although it had text). The fake mirrors the SQL: email substring match, exact email first, never returns email.
  const AN_EMAIL = sunnerEmail("Nguyễn Văn An");

  for (const [label, query] of [["full email", AN_EMAIL], ["email local part", AN_EMAIL.split("@")[0]]] as const) {
    test(`typing a Sunner's ${label} suggests that Sunner; picking it enables Người nhận and Gửi`, async ({ page, request }) => {
      await recipientBox(page).fill(query);
      await expect(options(page)).toHaveCount(1);
      await expect(optionNames(page).first()).toHaveText("Nguyễn Văn An");
      expect(await options(page).first().textContent()).not.toContain("@"); // the email is only a way to search, never shown
      await expect(noResult(page)).toHaveCount(0);
      // without "@" the search keeps matching email: the action says so explicitly (p_name_only false)
      expect((await sunnerSearches(request, sub)).at(-1)).toMatchObject({ p_query: query, p_name_only: false });
      await fillKudo(page, { search: query });
      await expect(recipientBox(page)).toHaveValue("Nguyễn Văn An");
      await expect(errorOf(page, "recipient")).toHaveCount(0);
      await expect(sendButton(page)).toBeEnabled();
    });
  }

  test("an email in capitals and with surrounding spaces still finds the Sunner", async ({ page }) => {
    await recipientBox(page).fill(`  ${AN_EMAIL.toUpperCase()}  `);
    await expect(options(page)).toHaveCount(1);
    await expect(optionNames(page).first()).toHaveText("Nguyễn Văn An");
  });

  test("an email fragment that fits several Sunners lists them by name", async ({ page }) => {
    await recipientBox(page).fill("van.an@"); // both nguyen.van.an@ and tran.van.an@
    await expect(optionNames(page)).toHaveText(["Nguyễn Văn An", "Trần Văn An"]);
  });

  // "@ + tên" (spec D.1, clarifications 2026-10-19): a leading "@" searches by name only, without the "@".
  test("'@Văn An' suggests by name (the '@' is not searched); picking one fills the field", async ({ page, request }) => {
    await recipientBox(page).fill("@Văn An");
    await expect(optionNames(page)).toHaveText(["Nguyễn Văn An", "Trần Văn An"]);
    expect((await sunnerSearches(request, sub)).at(-1)).toMatchObject({ p_query: "Văn An", p_name_only: true });
    await options(page).filter({ hasText: "Trần Văn An" }).click();
    await expect(recipientBox(page)).toHaveValue("Trần Văn An");
    await expect(options(page)).toHaveCount(0);
  });

  test("'@' alone lists the first 10 Sunners, never the signed-in user", async ({ page, request }) => {
    await recipientBox(page).fill("@");
    await expect(options(page)).toHaveCount(10);
    await expect(options(page).filter({ hasText: "E2E User" })).toHaveCount(0);
    await expect(noResult(page)).toHaveCount(0);
    expect((await sunnerSearches(request, sub)).at(-1)).toMatchObject({ p_query: "", p_name_only: true });
  });

  for (const query of [`@${AN_EMAIL.split("@")[0]}`, `@${AN_EMAIL}`]) {
    test(`'${query}' (an email after '@') suggests nobody: '@' searches names only`, async ({ page, request }) => {
      await recipientBox(page).fill(query);
      await expect(noResult(page)).toBeVisible();
      await expect(options(page)).toHaveCount(0);
      expect((await sunnerSearches(request, sub)).at(-1)).toMatchObject({ p_query: query.slice(1), p_name_only: true });
    });
  }

  test("a search with no match shows a status row (not an option); Gửi stays disabled", async ({ page, request }) => {
    await recipientBox(page).fill("zzzqqq-not-a-sunner");
    await expect(noResult(page)).toBeVisible();
    await expect(options(page)).toHaveCount(0);
    await expect(writeDialog(page).getByRole("listbox")).toHaveCount(0);
    expect((await sunnerSearches(request, sub)).at(-1)?.p_query).toBe("zzzqqq-not-a-sunner");
    await fillKudo(page, { recipient: null });
    await expect(sendButton(page)).toBeDisabled();
    await recipientBox(page).fill("Nguyễn Văn An"); // a new query replaces the row with real suggestions
    await expect(options(page).first()).toBeVisible();
    await expect(noResult(page)).toHaveCount(0);
  });

  test("the no-match row goes away on blur and when the text is cleared", async ({ page }) => {
    await recipientBox(page).fill("zzzqqq");
    await expect(noResult(page)).toBeVisible();
    await recipientBox(page).fill("");
    await expect(noResult(page)).toHaveCount(0);
    await recipientBox(page).fill("zzzqqq");
    await expect(noResult(page)).toBeVisible();
    await blurTo(page);
    await expect(noResult(page)).toHaveCount(0);
  });

  test("text typed but no Sunner picked: leaving the field says to choose from the suggestions; Gửi stays disabled", async ({ page, request }) => {
    await recipientBox(page).fill("Nguyễn Văn An");
    await expect(options(page).first()).toBeVisible();
    await blurTo(page);
    await expect(recipientBox(page)).toHaveAttribute("aria-invalid", "true");
    await expect(errorOf(page, "recipient")).toHaveText(PICK_FROM_LIST_MSG);
    await expect(errorOf(page, "recipient")).not.toContainText(REQUIRED_MSG);
    await fillKudo(page, { recipient: null });
    await expect(sendButton(page)).toBeDisabled();
    expect(await createCalls(request, sub)).toHaveLength(0);
    // picking from the list clears the message
    await recipientBox(page).fill("Nguyễn Văn"); // a different text, so the input event fires and a new search runs
    await writeDialog(page).getByRole("option", { name: "Nguyễn Văn An" }).click();
    await expect(errorOf(page, "recipient")).toHaveCount(0);
  });

  // Two deterministic cases (no race between a click and the 150 ms debounce): the first freezes time so the debounce cannot elapse
  // before the blur, the second holds the search answer back at the fake so the call is provably in flight when focus leaves.
  test("leaving the field inside the debounce cancels the search: no request, no list, no no-match row", async ({ page, request }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1_000)); // frozen: a debounce timer set now cannot fire until we run the clock
    for (const query of ["Nguyễn Văn An", "zzzqqq-not-a-sunner"]) {
      await recipientBox(page).fill(query);
      await blurTo(page);
      await page.clock.runFor(1_000); // far past the 150 ms debounce: it would fire here unless the blur cancelled it
    }
    await page.clock.resume();
    await expect(writeDialog(page).getByRole("listbox")).toHaveCount(0);
    await expect(noResult(page)).toHaveCount(0);
    // Positive proof of "never sent": the next real search is the first (and only) one the server ever saw.
    await recipientBox(page).fill("Trần Văn An");
    await expect(options(page).first()).toBeVisible();
    expect((await sunnerSearches(request, sub)).map((b) => b.p_query)).toEqual(["Trần Văn An"]);
  });

  test("leaving the field while the search is in flight drops the late answer: no list, no no-match row", async ({ page, request }) => {
    await delaySearchRpc(request, sub, 2_000);
    for (const query of ["Nguyễn Văn An", "zzzqqq-not-a-sunner"]) {
      const sent = (await sunnerSearches(request, sub)).length;
      const answered = searchAnswered(page, query);
      await recipientBox(page).fill(query);
      await expect.poll(async () => (await sunnerSearches(request, sub)).length).toBe(sent + 1); // logged by the fake: in flight now
      await blurTo(page); // well inside the 2 s the fake holds the answer
      await answered; // the browser aborts the body of a dropped answer (ERR_ABORTED), so wait for the response, not its end
      await flushUi(page);
      await expect(writeDialog(page).getByRole("listbox")).toHaveCount(0);
      await expect(noResult(page)).toHaveCount(0);
    }
  });

  test("typing then clearing the field, or only spaces, still reads 'Không được để trống' on blur", async ({ page }) => {
    await recipientBox(page).fill("Nguyễn");
    await recipientBox(page).fill("");
    await blurTo(page);
    await expect(errorOf(page, "recipient")).toHaveText(REQUIRED_MSG);
    await recipientBox(page).fill("   ");
    await blurTo(page);
    await expect(errorOf(page, "recipient")).toHaveText(REQUIRED_MSG);
  });
});

test.describe("Viết Kudo: Danh hiệu and nội dung", () => {
  test.beforeEach(async ({ page, request }) => {
    await openWriteModal(page, request);
  });

  test("leaving Danh hiệu empty shows 'Không được để trống'", async ({ page }) => {
    await writeDialog(page).getByRole("textbox", { name: /Danh hiệu/ }).focus();
    await blurTo(page);
    await expect(errorOf(page, "title")).toContainText(REQUIRED_MSG);
  });

  test("ID-11, ID-51 leaving the content empty shows 'Không được để trống'", async ({ page }) => {
    await editorOf(page).click();
    await blurTo(page);
    await expect(errorOf(page, "content")).toContainText(REQUIRED_MSG);
    await expect(sendButton(page)).toBeDisabled();
  });

  for (const [id, button, selector] of [
    ["ID-27", TOOLBAR.bold, "strong"], ["ID-28", TOOLBAR.italic, "em"], ["ID-29", TOOLBAR.strike, "s"],
    ["ID-32", TOOLBAR.quote, "blockquote"],
  ] as const) {
    test(`${id} '${button}' wraps the selected text in <${selector}>`, async ({ page }) => {
      await editorOf(page).click();
      await editorOf(page).pressSequentially("Cảm ơn bạn");
      await page.keyboard.press("ControlOrMeta+a");
      const toggle = writeDialog(page).getByRole("button", { name: button, exact: true });
      await toggle.click();
      await expect(editorOf(page).locator(selector)).toHaveText("Cảm ơn bạn");
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
    });
  }

  test("ID-30 'Danh sách đánh số' turns two lines into an ordered list", async ({ page }) => {
    await editorOf(page).click();
    await editorOf(page).pressSequentially("Điểm 1");
    await page.keyboard.press("Enter");
    await editorOf(page).pressSequentially("Điểm 2");
    await page.keyboard.press("ControlOrMeta+a");
    await writeDialog(page).getByRole("button", { name: TOOLBAR.list, exact: true }).click();
    await expect(editorOf(page).locator("ol > li")).toHaveText(["Điểm 1", "Điểm 2"]);
  });

  test("ID-12, ID-13, ID-33 '@' + name suggests Sunners; choosing one inserts a mention", async ({ page }) => {
    await editorOf(page).click();
    await editorOf(page).pressSequentially("Cảm ơn @");
    const list = writeDialog(page).getByTestId(WRITE.mentionList);
    // ID-12: "Cảm ơn @" alone already lists Sunners (the first 10 by name, never the signed-in user)
    await expect(list.getByRole("option")).toHaveCount(10);
    await expect(list.getByRole("option").filter({ hasText: "E2E User" })).toHaveCount(0);
    await editorOf(page).pressSequentially("Nguyen");
    await expect(list.getByRole("option", { name: "Nguyễn Văn An" })).toBeVisible();
    for (const text of await list.getByRole("option").allTextContents()) expect(fold(text)).toContain("nguyen");
    await list.getByRole("option", { name: "Nguyễn Văn An" }).click();
    const mention = editorOf(page).locator(WRITE.mention);
    await expect(mention).toHaveText("@Nguyễn Văn An");
    await expect(mention).toHaveAttribute("data-id", AN_ID);
    await expect(list).toBeHidden();
  });
});

// "@ + tên" in the content (spec D.1, clarifications 2026-10-19 "@ + tên"): names with spaces, a no-match status row,
// names only (never email), Esc closes the list but not the modal.
test.describe("Viết Kudo: @ + tên in the content", () => {
  let sub = "";
  test.beforeEach(async ({ page, request }) => {
    sub = await openWriteModal(page, request);
    await editorOf(page).click();
  });
  const list = (page: Page) => writeDialog(page).getByTestId(WRITE.mentionList);
  const noMention = (page: Page) => writeDialog(page).getByRole("status").filter({ hasText: NO_RESULT_MSG });

  test("'@Nguyễn Văn B' (a name with spaces) narrows to one Sunner; Enter inserts the mention in place", async ({ page, request }) => {
    await editorOf(page).pressSequentially("Cảm ơn @Nguyễn Văn B");
    await expect(list(page).getByRole("option")).toHaveText(["Nguyễn Văn Bình"]);
    expect((await sunnerSearches(request, sub)).at(-1)).toMatchObject({ p_query: "Nguyễn Văn B", p_name_only: true });
    await page.keyboard.press("Enter");
    const mention = editorOf(page).locator(WRITE.mention);
    await expect(mention).toHaveText("@Nguyễn Văn Bình");
    await expect(mention).toHaveAttribute("data-id", sunnerIdByName("Nguyễn Văn Bình")!);
    await expect(editorOf(page)).toHaveText(/^Cảm ơn @Nguyễn Văn Bình\s*$/);
    await expect(list(page)).toBeHidden();
  });

  test("'@zzz' shows the no-match status row (no option, no listbox); Esc closes it and keeps the modal", async ({ page }) => {
    await editorOf(page).pressSequentially("Cảm ơn @zzz");
    await expect(noMention(page)).toBeVisible();
    await expect(writeDialog(page).getByRole("option")).toHaveCount(0);
    await expect(writeDialog(page).getByRole("listbox")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(noMention(page)).toHaveCount(0);
    await expect(writeDialog(page)).toBeVisible();
    await expect(editorOf(page)).toHaveText("Cảm ơn @zzz");
  });

  test("an unmatched '@word' followed by more text closes the no-match row instead of following the caret", async ({ page, request }) => {
    await editorOf(page).pressSequentially("Cảm ơn @team");
    await expect(noMention(page)).toBeVisible();
    const answered = searchAnswered(page, "team đã"); // typed inside one debounce: a single search, answered empty → the suggestion exits
    await editorOf(page).pressSequentially(" đã");
    await answered;
    await flushUi(page);
    await editorOf(page).pressSequentially(" hỗ trợ dự án");
    await expect(noMention(page)).toHaveCount(0);
    await expect(writeDialog(page).getByRole("listbox")).toHaveCount(0);
    await expect(editorOf(page)).toHaveText("Cảm ơn @team đã hỗ trợ dự án");
    // A later, unrelated search (recipient field) is a marker in the ordered log: a search triggered by the extra words
    // would sit before it. No sleeping, no "nothing happened within N ms".
    await recipientBox(page).fill("Trần Văn An");
    await expect(writeDialog(page).getByRole("option", { name: "Trần Văn An" })).toBeVisible();
    const queries = (await sunnerSearches(request, sub)).map((b) => String(b.p_query));
    expect(queries.at(-1)).toBe("Trần Văn An");
    expect(queries.filter((q) => q.includes("hỗ"))).toEqual([]); // no search carried the words typed after the exit
  });

  test("Esc closes an open suggestion list without inserting a mention or closing the modal", async ({ page }) => {
    await editorOf(page).pressSequentially("@Nguyen");
    await expect(list(page).getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(list(page)).toBeHidden();
    await expect(writeDialog(page)).toBeVisible();
    await expect(editorOf(page).locator(WRITE.mention)).toHaveCount(0);
    await expect(editorOf(page)).toHaveText("@Nguyen");
  });

  test("a mention never matches by email: '@nguyen.van.an@' finds nobody", async ({ page, request }) => {
    await editorOf(page).pressSequentially("@nguyen.van.an@");
    await expect(noMention(page)).toBeVisible();
    await expect(writeDialog(page).getByRole("option")).toHaveCount(0);
    expect((await sunnerSearches(request, sub)).at(-1)).toMatchObject({ p_query: "nguyen.van.an@", p_name_only: true });
  });
});

test.describe("Viết Kudo: Hashtag", () => {
  test.beforeEach(async ({ page, request }) => {
    await openWriteModal(page, request);
  });
  const FIVE = ["Toàn diện", "Giỏi chuyên môn", "Hiệu suất cao", "Truyền cảm hứng", "Cống hiến"];

  test("ID-14, ID-52 closing the dropdown with no hashtag shows 'Không được để trống'; picking one clears it", async ({ page }) => {
    await writeDialog(page).getByRole("button", { name: "+ Hashtag" }).click();
    await expect(writeDialog(page).getByTestId(WRITE.hashtagDropdown)).toBeVisible();
    await blurTo(page);
    await expect(errorOf(page, "hashtags")).toContainText(REQUIRED_MSG);
    await pickHashtags(page, ["Cống hiến"]);
    await expect(errorOf(page, "hashtags")).toBeHidden();
  });

  test("ID-15, ID-34, ID-35 picking tags adds one chip each, in the catalog's own names", async ({ page }) => {
    await pickHashtags(page, ["Cống hiến", "Aim High", "Be Agile"]);
    await expect(chipsOf(page)).toHaveCount(3);
    await expect(chipsOf(page).first()).toContainText("Cống hiến");
  });

  test("ID-36 the x on a chip removes only that chip", async ({ page }) => {
    await pickHashtags(page, ["Cống hiến", "Aim High"]);
    await chipsOf(page).first().getByRole("button", { name: /Xóa/ }).click();
    await expect(chipsOf(page)).toHaveCount(1);
    await expect(chipsOf(page)).toContainText("Aim High");
  });

  test("ID-16, ID-17, ID-53 five tags fit; at 5 the other rows are disabled; removing one frees them", async ({ page }) => {
    await pickHashtags(page, FIVE);
    await expect(chipsOf(page)).toHaveCount(5);
    const dropdown = writeDialog(page).getByTestId(WRITE.hashtagDropdown);
    await writeDialog(page).getByRole("button", { name: "+ Hashtag" }).click();
    const sixth = dropdown.getByRole("option", { name: "Aim High" });
    await expect(sixth).toHaveAttribute("aria-disabled", "true");
    await sixth.click({ force: true });
    await expect(chipsOf(page)).toHaveCount(5);
    await blurTo(page);
    await chipsOf(page).first().getByRole("button", { name: /Xóa/ }).click();
    await writeDialog(page).getByRole("button", { name: "+ Hashtag" }).click();
    await expect(dropdown.getByRole("option", { name: "Aim High" })).not.toHaveAttribute("aria-disabled", "true");
  });
});

test.describe("Viết Kudo: Image", () => {
  let sub = "";
  test.beforeEach(async ({ page, request }) => {
    sub = await openWriteModal(page, request);
  });

  test("ID-21, ID-22, ID-37 jpg, png and webp each make a thumbnail", async ({ page }) => {
    await attach(page, [file("a.jpg", "image/jpeg", JPG)]);
    await attach(page, [file("b.png", "image/png", PNG)]);
    await attach(page, [file("c.webp", "image/webp", WEBP)]);
    await expect(thumbsOf(page)).toHaveCount(3);
    await expect(addImageBtn(page)).toBeVisible();
  });

  test("ID-18 three images keep '+ Image' visible", async ({ page }) => {
    await attach(page, photos(3));
    await expect(thumbsOf(page)).toHaveCount(3);
    await expect(addImageBtn(page)).toBeVisible();
  });

  test("ID-19, ID-20, ID-38, ID-54 five images hide '+ Image'; a 6th is refused", async ({ page }) => {
    await attach(page, photos(5));
    await expect(thumbsOf(page)).toHaveCount(5);
    await expect(addImageBtn(page)).toBeHidden();
    await attach(page, photos(1));
    await expect(thumbsOf(page)).toHaveCount(5);
  });

  test("six files chosen at once keep only five", async ({ page }) => {
    await attach(page, photos(6));
    await expect(thumbsOf(page)).toHaveCount(5);
  });

  test("ID-39, ID-40 the x removes one thumbnail; at 5 it brings '+ Image' back", async ({ page }) => {
    await attach(page, photos(3));
    await thumbsOf(page).nth(1).getByRole("button", { name: /Xóa ảnh/ }).click();
    await expect(thumbsOf(page)).toHaveCount(2);
    await attach(page, photos(3));
    await expect(thumbsOf(page)).toHaveCount(5);
    await expect(addImageBtn(page)).toBeHidden();
    await thumbsOf(page).first().getByRole("button", { name: /Xóa ảnh/ }).click();
    await expect(thumbsOf(page)).toHaveCount(4);
    await expect(addImageBtn(page)).toBeVisible();
  });

  for (const [id, name, mime] of [
    ["ID-23", "doc.pdf", "application/pdf"], ["ID-24", "clip.mp4", "video/mp4"], ["ID-55", "note.txt", "text/plain"],
  ] as const) {
    test(`${id} ${name} is refused with a file-format message and no thumbnail`, async ({ page }) => {
      await attach(page, [file(name, mime, Buffer.from("not an image"))]);
      await expect(errorOf(page, "images")).toContainText(/định dạng/i);
      await expect(thumbsOf(page)).toHaveCount(0);
    });
  }

  test("an image over 5 MB is refused", async ({ page }) => {
    await attach(page, [file("huge.jpg", "image/jpeg", Buffer.concat([JPG, Buffer.alloc(5 * 1024 * 1024)]))]);
    await expect(errorOf(page, "images")).toBeVisible();
    await expect(thumbsOf(page)).toHaveCount(0);
  });

  test("a .jpg that is really a PDF passes the browser MIME check but the server refuses it: no upload, no Kudo", async ({ page, request }) => {
    await fillKudo(page);
    await attach(page, [file("fake.jpg", "image/jpeg", Buffer.from("%PDF-1.4\n1 0 obj\n"))]);
    await expect(thumbsOf(page)).toHaveCount(1);
    await sendButton(page).click();
    await expect(errorOf(page, "images")).toBeVisible();
    await expect(writeDialog(page)).toBeVisible();
    const log = await kudoLog(request, sub);
    expect(log.uploads).toHaveLength(0);
    expect(rpcCalls(log, "create_kudo")).toHaveLength(0);
  });
});

test.describe("Viết Kudo: anonymous", () => {
  test("ID-6, ID-41-44 the checkbox toggles and shows / hides the alias field", async ({ page, request }) => {
    await openWriteModal(page, request);
    const box = writeDialog(page).getByRole("checkbox", { name: ANON });
    const alias = writeDialog(page).getByRole("textbox", { name: "Tên ẩn danh" });
    await expect(box).not.toBeChecked();
    await box.check();
    await expect(box).toBeChecked();
    await expect(alias).toBeVisible();
    await box.uncheck();
    await expect(box).not.toBeChecked();
    await expect(alias).toBeHidden();
  });

  for (const c of [
    { name: "anonymous with an alias", alias: "Ninja", off: false, anon: true, shows: "Ninja" },
    { name: "anonymous without an alias falls back to the default label", alias: "", off: false, anon: true, shows: "Ẩn danh" },
    { name: "alias typed then anonymous switched off sends no alias and shows the sender", alias: "Ninja", off: true, anon: false, shows: "E2E User" },
  ]) {
    test(`ID-46 payload and board: ${c.name}`, async ({ page, request }) => {
      const sub = await openWriteModal(page, request);
      await fillKudo(page);
      const box = writeDialog(page).getByRole("checkbox", { name: ANON });
      await box.check();
      if (c.alias) await writeDialog(page).getByRole("textbox", { name: "Tên ẩn danh" }).fill(c.alias);
      if (c.off) await box.uncheck();
      await sendButton(page).click();
      await expect(writeDialog(page)).toBeHidden();
      const [call] = await createCalls(request, sub);
      expect(call.p_is_anonymous).toBe(c.anon);
      if (c.anon) expect(call.p_anonymous_name || null).toBe(c.alias || null);
      else expect(call.p_anonymous_name ?? null).toBeNull();
      const first = page.getByTestId(SEL.allKudos).getByTestId(SEL.kudoCard).first();
      await expect(first).toContainText(c.shows);
      if (c.anon) await expect(first).not.toContainText("E2E User");
    });
  }
});

test.describe("Viết Kudo: Hủy, Gửi", () => {
  for (const [label, close] of [
    ["Hủy", (page: Page) => writeDialog(page).getByRole("button", { name: "Hủy", exact: true }).click()],
    ["Esc", (page: Page) => page.keyboard.press("Escape")],
    ["click on the backdrop", (page: Page) => page.mouse.click(5, 5)],
  ] as const) {
    test(`ID-45 ${label} closes the modal and discards the form`, async ({ page, request }) => {
      const sub = await openWriteModal(page, request);
      await fillKudo(page);
      await close(page);
      await expect(writeDialog(page)).toBeHidden();
      await page.getByTestId(SEL.composeTrigger).click();
      await expect(writeDialog(page)).toBeVisible();
      await expect(recipientBox(page)).toHaveValue("");
      await expect(editorOf(page)).toHaveText("");
      await expect(chipsOf(page)).toHaveCount(0);
      await expect(sendButton(page)).toBeDisabled();
      expect(await createCalls(request, sub)).toHaveLength(0);
    });
  }

  test("ID-47 one tag, no image: the RPC gets the picked recipient, title, content, slug; modal closes", async ({ page, request }) => {
    const sub = await openWriteModal(page, request);
    await fillKudo(page);
    await sendButton(page).click();
    await expect(writeDialog(page)).toBeHidden();
    const calls = await createCalls(request, sub);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      p_recipient_id: AN_ID, p_title: VALID_KUDO.title, p_content: VALID_KUDO.text, p_hashtag_slugs: ["dedicated"], p_is_anonymous: false,
    });
    expect(calls[0].p_image_urls ?? []).toEqual([]);
    expect(calls[0].p_anonymous_name ?? null).toBeNull();
    expect((await kudoLog(request, sub)).uploads).toHaveLength(0);
  });

  test("ID-46 two tags + two images: shows loading, blocks a double send, uploads real files as flat identity-free {uuid}.{ext} objects, sends their URLs; the board card shows both", async ({ page, request }) => {
    const sub = await openWriteModal(page, request);
    await delayCreateRpc(request, sub, 800);
    await fillKudo(page, { tags: ["Cống hiến", "Giỏi chuyên môn"] });
    await attach(page, [file("a.jpg", "image/jpeg", JPG), file("b.png", "image/png", PNG)]);
    await expect(thumbsOf(page)).toHaveCount(2);
    const send = sendButton(page);
    await send.click();
    await expect(send).toBeDisabled();
    await expect(send).toHaveAttribute("aria-busy", "true");
    await send.click({ force: true, timeout: 1000 }).catch(() => undefined);
    await expect(writeDialog(page)).toBeHidden();
    const log = await kudoLog(request, sub);
    expect(log.uploads.map((u) => u.magic).sort()).toEqual(["89504e47", "ffd8ffe0"]);
    for (const u of log.uploads) {
      expect(u.path).toMatch(/^[0-9a-f-]{36}\.(jpg|png)$/); // flat and identity-free
      expect(u.path).not.toContain(sub);
    }
    const calls = rpcCalls(log, "create_kudo");
    expect(calls).toHaveLength(1);
    expect([...(calls[0].p_hashtag_slugs as string[])].sort()).toEqual(["dedicated", "professional"]);
    const urls = calls[0].p_image_urls as string[];
    expect(urls).toHaveLength(2);
    expect(urls[0]).toMatch(/\/storage\/v1\/object\/public\/kudo-images\/[0-9a-f-]{36}\.jpg$/);
    expect(urls[1]).toMatch(/\/storage\/v1\/object\/public\/kudo-images\/[0-9a-f-]{36}\.png$/);
    for (const url of urls) expect(url).not.toContain(sub); // the public URL must not reveal the sender
    // Read side: the new top card renders both uploaded files. The origin allow-list (lib/validation/kudos.ts) drops a URL
    // outside the Supabase origin, so a broken filter leaves fewer or other images here. next/image is unoptimized: src is the URL.
    const images = page.getByTestId(SEL.allKudos).getByTestId(SEL.kudoCard).first().getByTestId("kudo-image");
    await expect(images).toHaveCount(2);
    for (const [index, url] of urls.entries()) {
      const name = url.split("/").pop()!;
      await expect(images.nth(index).locator("img")).toHaveAttribute("src", new RegExp(name.replace(".", "\\.") + "$"));
    }
  });

  test("ID-27, ID-13 content goes to the RPC as Markdown: **bold** and @[Tên](id)", async ({ page, request }) => {
    const sub = await openWriteModal(page, request);
    await fillKudo(page, { text: null });
    await editorOf(page).click();
    await page.keyboard.press("ControlOrMeta+b");
    await editorOf(page).pressSequentially("Cảm ơn");
    await page.keyboard.press("ControlOrMeta+b");
    await editorOf(page).pressSequentially(" @Nguyen");
    await writeDialog(page).getByTestId(WRITE.mentionList).getByRole("option", { name: "Nguyễn Văn An" }).click();
    await sendButton(page).click();
    await expect(writeDialog(page)).toBeHidden();
    const [call] = await createCalls(request, sub);
    expect(call.p_content).toMatch(new RegExp(`^\\*\\*Cảm ơn\\*\\* @\\[Nguyễn Văn An\\]\\(${AN_ID}\\)\\s*$`));
  });

  test("server failure after upload: generic message only, uploaded images are deleted, form stays for a retry", async ({ page, request }) => {
    const sub = await openWriteModal(page, request);
    await failCreateRpc(request, sub);
    await fillKudo(page);
    await attach(page, [file("a.jpg", "image/jpeg", JPG)]);
    await sendButton(page).click();
    await expect(errorOf(page, "form")).toBeVisible();
    await expect(errorOf(page, "form")).not.toContainText(/boom|XX000|injected|secret/i);
    await expect(writeDialog(page)).toBeVisible();
    await expect(sendButton(page)).toBeEnabled();
    await expect.poll(async () => (await kudoLog(request, sub)).deletes.length).toBe(1);
    const log = await kudoLog(request, sub);
    expect(log.uploads).toHaveLength(1);
    expect(log.deletes).toEqual(log.uploads.map((u) => u.path));
    expect(log.objects).toEqual([]);
    expect(rpcCalls(log, "create_kudo")).toHaveLength(1);
  });

  test("on /sun-kudos the new Kudo leads the All Kudos feed", async ({ page, request }) => {
    const title = "LỜI CẢM ƠN KIỂM THỬ";
    await openWriteModal(page, request);
    await fillKudo(page, { title });
    await sendButton(page).click();
    await expect(writeDialog(page)).toBeHidden();
    const first = page.getByTestId(SEL.allKudos).getByTestId(SEL.kudoCard).first();
    await expect(first.getByTestId("kudo-title")).toHaveText(title);
    await expect(first.getByTestId("kudo-content")).toContainText(VALID_KUDO.text);
    await expect(first).toContainText("Nguyễn Văn An");
    await expect(first).toContainText("E2E User");
  });

  for (const path of ["/", "/awards-information"]) {
    test(`success from ${path} closes the modal and stays on the page`, async ({ page, request }) => {
      const sub = await openAuthed(page, request, path);
      await openWidgetMenu(page);
      await widgetMenu(page).getByRole("button", { name: "Viết KUDOS", exact: true }).click();
      await expect(writeDialog(page)).toBeVisible();
      await fillKudo(page);
      await sendButton(page).click();
      await expect(writeDialog(page)).toBeHidden();
      expect(new URL(page.url()).pathname).toBe(path);
      expect(await createCalls(request, sub)).toHaveLength(1);
    });
  }
});

test.describe("Add link (OyDLDuSGEa)", () => {
  const dlg = (page: Page) => addLinkDialog(page);
  const fields = (page: Page) => ({
    text: dlg(page).getByRole("textbox", { name: ADD_LINK.text, exact: true }),
    link: dlg(page).getByRole("textbox", { name: ADD_LINK.url, exact: true }),
    save: dlg(page).getByRole("button", { name: "Lưu", exact: true }),
    cancel: dlg(page).getByRole("button", { name: "Hủy", exact: true }),
  });
  const openAddLink = async (page: Page) => {
    await writeDialog(page).getByRole("button", { name: TOOLBAR.link, exact: true }).click();
    await expect(dlg(page)).toBeVisible();
  };
  /** Opens a fresh Add link dialog, saves the values, and returns whether it stayed open with the given field error. */
  async function tryInvalid(page: Page, text: string, link: string, field: "text" | "link") {
    await openAddLink(page);
    await fields(page).text.fill(text);
    await fields(page).link.fill(link);
    await fields(page).save.click();
    await expect(dlg(page).getByTestId(errorId(field))).toBeVisible();
    await expect(editorOf(page).locator("a")).toHaveCount(0);
    await page.keyboard.press("Escape"); // closes only Add link
    await expect(dlg(page)).toBeHidden();
    await expect(writeDialog(page)).toBeVisible();
  }
  test.beforeEach(async ({ page, request }) => {
    await openWriteModal(page, request);
    await editorOf(page).click();
  });

  test("opens empty with title Thêm đường dẫn, Nội dung, URL, Hủy and Lưu; clicking the Text label focuses its field", async ({ page }) => {
    await openAddLink(page);
    await expect(dlg(page).getByRole("heading", { name: ADD_LINK.title, exact: true })).toBeVisible();
    await expect(fields(page).text).toHaveValue("");
    await expect(fields(page).link).toHaveValue("");
    await expect(fields(page).cancel).toBeVisible();
    await expect(fields(page).save).toBeVisible();
    await dlg(page).getByText(ADD_LINK.text, { exact: true }).click();
    await expect(fields(page).text).toBeFocused();
  });

  test("ID-31 valid Text + Link: Lưu closes Add link and inserts the link into the editor", async ({ page }) => {
    await openAddLink(page);
    await fields(page).text.fill("Sample Link");
    await fields(page).link.fill("https://www.example.com");
    await fields(page).save.click();
    await expect(dlg(page)).toBeHidden();
    await expect(writeDialog(page)).toBeVisible();
    const anchor = editorOf(page).locator('a[href="https://www.example.com"]');
    await expect(anchor).toHaveText("Sample Link");
  });

  test("Text empty, spaces only or 101 characters is rejected", async ({ page }) => {
    for (const text of ["", "   ", "a".repeat(101)]) await tryInvalid(page, text, "https://valid.com", "text");
  });

  test("Link empty, 'invalid-url', 'www', javascript:, ftp: or over 2048 characters is rejected", async ({ page }) => {
    for (const link of ["", "invalid-url", "www", "javascript:alert(1)", "ftp://example.com", `https://example.com/${"a".repeat(2049)}`]) {
      await tryInvalid(page, "Sample Link", link, "link");
    }
  });

  test("boundaries: Text of 1 character and a 2048-character https URL are accepted", async ({ page }) => {
    const link = `https://example.com/${"a".repeat(2048 - "https://example.com/".length)}`;
    await openAddLink(page);
    await fields(page).text.fill("a");
    await fields(page).link.fill(link);
    await fields(page).save.click();
    await expect(dlg(page)).toBeHidden();
    await expect(editorOf(page).locator("a")).toHaveAttribute("href", link);
  });

  test("Hủy closes without inserting anything", async ({ page }) => {
    await openAddLink(page);
    await fields(page).text.fill("Sample Link");
    await fields(page).link.fill("https://valid.com");
    await fields(page).cancel.click();
    await expect(dlg(page)).toBeHidden();
    await expect(editorOf(page).locator("a")).toHaveCount(0);
    await expect(writeDialog(page)).toBeVisible();
  });
});
