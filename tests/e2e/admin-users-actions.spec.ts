import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { ADMIN_PEOPLE } from "./support/admin-users-dataset.mjs";
import { COPY, TID } from "./support/admin-users-contract";
import { FAKE, cellIn, openUsers, rowOf } from "./support/admin-users-helpers";

// Admin - User, ca 7 (clarifications: role change through a menu and a confirm step; the viewer cannot change their own role).
// Target: fixture person 7, a plain user on page 1 (row 9). Every test has its own sub, so role changes never leak.
const TARGET = ADMIN_PEOPLE[7];

const trigger = (page: Page, userId: string) => rowOf(page, userId).getByTestId(TID.rowActions);
const roleOfRow = (page: Page, userId: string) => cellIn(rowOf(page, userId), "role");

/** Opens the target row's menu and clicks its single role item (opens the confirm dialog). */
async function askForRoleChange(page: Page, userId: string) {
  await trigger(page, userId).click();
  await page.getByTestId(TID.roleItem).click();
  await expect(page.getByTestId(TID.roleDialog)).toBeVisible();
}

/** The set-role calls the fake has received for this caller. */
async function roleCalls(request: APIRequestContext, sub: string) {
  const res = await request.get(`${FAKE}/__admin-role-log?sub=${sub}`);
  return (await res.json()).calls as { p_user_id: string; p_role: string }[];
}

test.describe("Admin - User: row actions (ca 7)", () => {
  test("the row menu opens with Enter, moves with the arrow key, and Escape returns focus to its button", async ({ page, request }) => {
    await openUsers(page, request);
    const button = trigger(page, TARGET.user_id);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId(TID.roleMenu)).toBeVisible();
    await expect(page.getByTestId(TID.roleItem)).toHaveText(COPY.roleItemToAdmin.vi);
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId(TID.roleItem)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId(TID.roleMenu)).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("Escape and Cancel close the confirm dialog and never call the role RPC", async ({ page, request }) => {
    const { sub } = await openUsers(page, request);
    await askForRoleChange(page, TARGET.user_id);
    const dialog = page.getByTestId(TID.roleDialog);
    await expect(dialog).toContainText(TARGET.full_name);
    await expect(dialog).toContainText(TARGET.email);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await askForRoleChange(page, TARGET.user_id);
    await page.getByTestId(TID.roleCancel).click();
    await expect(dialog).toBeHidden();
    expect(await roleCalls(request, sub)).toEqual([]);
    await expect(roleOfRow(page, TARGET.user_id)).toHaveText(COPY.roleLabel.user.vi);
  });

  test("Confirm changes the role in place, shows a status, and the menu now offers the way back", async ({ page, request }) => {
    const { sub } = await openUsers(page, request);
    await askForRoleChange(page, TARGET.user_id);
    await page.getByTestId(TID.roleConfirm).click();
    await expect(page.getByTestId(TID.statusToast)).toHaveText(COPY.roleUpdated.vi);
    await expect(page.getByTestId(TID.roleDialog)).toBeHidden();
    await expect(roleOfRow(page, TARGET.user_id)).toHaveText(COPY.roleLabel.admin.vi);
    expect(await roleCalls(request, sub)).toEqual([{ p_user_id: TARGET.user_id, p_role: "admin" }]);

    await trigger(page, TARGET.user_id).click();
    await expect(page.getByTestId(TID.roleItem)).toHaveText(COPY.roleItemToUser.vi);
  });

  test("the viewer's own row has a disabled action button and no menu", async ({ page, request }) => {
    const { sub } = await openUsers(page, request);
    const own = trigger(page, sub);
    await expect(own).toBeDisabled();
    await expect(own).toHaveAttribute("aria-label", COPY.selfHint.vi);
    await expect(page.getByTestId(TID.roleMenu)).toHaveCount(0);
  });

  test("refusals and a 500 show one generic message, keep the row, and leak no server detail", async ({ page, request }) => {
    const { sub } = await openUsers(page, request);
    for (const code of ["forbidden", "not_found", "server"]) {
      expect((await request.get(`${FAKE}/__admin-role-fail?sub=${sub}&code=${code}`)).ok(), code).toBe(true);
      await askForRoleChange(page, TARGET.user_id);
      await page.getByTestId(TID.roleConfirm).click();
      await expect(page.getByTestId(TID.roleError), code).toHaveText(COPY.roleFailed.vi);
      const dialog = page.getByTestId(TID.roleDialog);
      await expect(dialog).toBeVisible();
      expect(await dialog.innerText(), code).not.toMatch(/forbidden|not_found|boom-secret/);
      await page.getByTestId(TID.roleCancel).click();
      await expect(dialog).toBeHidden();
      await expect(roleOfRow(page, TARGET.user_id), code).toHaveText(COPY.roleLabel.user.vi);
    }
  });
});
