// Viết Kudo modal layout across screen heights (owner report 2026-10-20: the form spilled over the rounded panel and a
// scrollbar showed even on large screens). Tall screens keep the Figma ihQ26W78P2 geometry; shorter screens tighten the
// vertical spacing so the form fits, and when it still cannot fit only the inner area scrolls, inside the panel.
import { test, expect, type Page } from "@playwright/test";
import { openWriteModal, sendButton, writeDialog, dialogHeading, WRITE } from "./support/kudos-contract";

type Rect = { top: number; bottom: number; left: number; right: number; height: number };

/** The dialog panel, its scroll area (the dialog's only child) and the scroll sizes of that area. */
async function measure(page: Page) {
  return writeDialog(page).evaluate((dialog) => {
    const rect = (el: Element): Rect => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    };
    const scroller = dialog.firstElementChild as HTMLElement;
    return { dialog: rect(dialog), scroller: rect(scroller), scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight };
  });
}

async function expectInsidePanel(page: Page) {
  const m = await measure(page);
  expect(m.dialog.top, "panel starts on screen").toBeGreaterThanOrEqual(0);
  expect(m.dialog.bottom, "panel ends on screen").toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(m.scroller.top, "scroll area starts inside the panel").toBeGreaterThanOrEqual(m.dialog.top - 0.5);
  expect(m.scroller.bottom, "scroll area ends inside the panel").toBeLessThanOrEqual(m.dialog.bottom + 0.5);
  // Scroll to the end: the last control must still sit inside the panel, not under its rounded border.
  await writeDialog(page).evaluate((dialog) => (dialog.firstElementChild as HTMLElement).scrollTo({ top: 1e6 }));
  const send = (await sendButton(page).boundingBox())!;
  const after = await measure(page);
  expect(send.y + send.height, "Gửi stays inside the panel").toBeLessThanOrEqual(after.dialog.bottom + 0.5);
  return m;
}

test("1440x900 laptop: the whole form fits in the panel, no vertical scrollbar", async ({ page, request }) => {
  await openWriteModal(page, request); // openAuthed sets 1440x900; resize with the modal open
  await page.setViewportSize({ width: 1440, height: 900 });
  const m = await expectInsidePanel(page);
  expect(m.scrollHeight, "no vertical scroll inside the modal").toBeLessThanOrEqual(m.clientHeight + 1);
});

test("1440x1100 tall screen: Figma geometry (40px padding, 32px title, 200px editor), no scrollbar", async ({ page, request }) => {
  await openWriteModal(page, request); // openAuthed sets 1440x900; resize with the modal open
  await page.setViewportSize({ width: 1440, height: 1100 });
  const m = await expectInsidePanel(page);
  expect(m.scrollHeight).toBeLessThanOrEqual(m.clientHeight + 1);
  const heading = (await dialogHeading(page).boundingBox())!;
  expect(Math.round(heading.y - m.dialog.top)).toBe(40);
  await expect(dialogHeading(page)).toHaveCSS("font-size", "32px");
  const editorBox = (await writeDialog(page).getByTestId(WRITE.editor).evaluate((el) => el.parentElement!.parentElement!.getBoundingClientRect().height));
  expect(Math.round(editorBox)).toBe(200);
});

for (const size of [{ width: 1280, height: 720 }, { width: 1366, height: 600 }]) {
  test(`${size.width}x${size.height} short screen: only the inner area scrolls, everything stays inside the panel`, async ({ page, request }) => {
    await openWriteModal(page, request); // openAuthed sets 1440x900; resize with the modal open
    await page.setViewportSize(size);
    await expectInsidePanel(page);
  });
}
