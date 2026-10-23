// Sửa Kudo (plans/261022-edit-kudo): the selector and text contract for edit-kudo.spec.ts. This file is the single source:
// phase 02a (UI) implements against it and must not rename anything here; phase 02b (action) sends what updateKudo's FormData
// names below. Only the e2e owner edits it.
//
// UI the spec relies on (reuses the Viết Kudo modal, support/kudos-contract.ts WRITE/TOOLBAR, in edit mode):
//  - pencil: a <button> named EDIT.pencil.vi ("Chỉnh sửa Kudo", en "Edit Kudo") with data-testid "kudo-edit-icon", beside the title
//    of KudoPostCard, ONLY when kudo.is_mine. >= 44 x 44 px, reachable by Tab, Enter/Space open the modal.
//  - edit dialog: native <dialog>, role "dialog", name EDIT.title.vi ("Chỉnh sửa bài viết của bạn", en "Edit your Kudo").
//  - recipient: combobox named /Người nhận/ showing the recipient's name; READ-ONLY or DISABLED (the spec accepts either);
//    typing into it opens no suggestion list.
//  - anonymous checkbox (same name as Viết Kudo: "Gửi lời cám ơn và ghi nhận ẩn danh"): checked exactly when the Kudo is
//    anonymous, DISABLED in edit mode.
//  - alias: textbox "Tên ẩn danh" (en "Anonymous name") only for an anonymous Kudo, pre-filled with anonymousName.
//  - editor, title ("Danh hiệu"), hashtag chips, image thumbnails and the "+ Image" input: the same test ids as Viết Kudo (WRITE).
//  - counter: data-testid EDIT.counterTestId under the editor, text `${n}/5.000` (vi) or `${n}/5,000` (en), where n = code points
//    of the Markdown that would be sent (what the server counts). Shown in Write AND Edit.
//  - save: button named EDIT.save.vi ("Lưu", en "Save"), disabled until title, content and >= 1 hashtag are set.
//  - cancel: button "Hủy" (Esc and backdrop close also discard).
//  - generic save error: data-testid EDIT.genericErrorTestId ("error-form", role alert) with EDIT.genericError.vi/en; the dialog stays open.
//  - after a successful save: the dialog closes, the card [data-testid="kudo-card"][data-kudo-id] shows the new title/content/hashtags/
//    images in place (no reload), keeps heart_count, created_at (time) and its position.
//
// FormData of updateKudo (lib/kudos/update-kudo-action.ts, 02b), as the spec reads it through update_kudo below:
//   kudoId, title, content (Markdown), hashtags (repeated slug), anonymousName (only when the Kudo is anonymous and not blank),
//   keepImages (repeated URL, kept images in order), images (repeated new File, in order). Recipient / isAnonymous never sent.
//
// Fake Supabase (write-kudo-fixtures.mjs), the contract the spec checks against:
//  - rpc update_kudo: body { p_id, p_title, p_content, p_hashtag_slugs, p_image_urls, p_anonymous_name }. NO p_recipient_id, NO
//    p_is_anonymous. Sender-only: a missing Kudo or one of another user -> 400 / 22023 "not_found" (never a different answer).
//    Returns the removed image URLs (array). p_image_urls = kept URLs in order, then the new uploads.
//  - read-back: rpc kudo_detail { p_id } (existing RPC, granted to `authenticated`). Choice documented here: the plan named
//    kudos_rows(array[id], uid), but the real kudos_rows is revoked from `authenticated` (20261015100000_create_kudos.sql), so the
//    action cannot call it with the user's JWT. kudo_detail is the same row shape and is what View Kudo already uses.
//  - Storage: removed images are deleted (DELETE) only after update_kudo succeeded; new uploads are deleted when it fails.
//  - Controls (GET, ?sub=): /__kudo-seed-own?anon=1&alias=, /__kudo-fail-update?on=1|0, /__kudo-refuse-update-once?code=.
//    Only Kudos seeded by /__kudo-seed-own (or created in the same test) are editable in the fake; the base fixture Kudos are
//    shown read-only by the board and profile, so a test that saves uses a seeded Kudo.
//  - Known limit: kudo_detail read-back also answers for a created Kudo whose id matches a profile-fixture id (c2000000-…-0001..13).
//    No spec looks up those ids through kudo_detail, so the overlap is harmless today.

export const EDIT = {
  title: { vi: "Chỉnh sửa bài viết của bạn", en: "Edit your Kudo" },
  pencil: { vi: "Chỉnh sửa Kudo", en: "Edit Kudo" }, // accessible name of the button
  pencilTestId: "kudo-edit-icon",
  save: { vi: "Lưu", en: "Save" },
  cancel: "Hủy",
  alias: { vi: "Tên ẩn danh", en: "Anonymous name" },
  counterTestId: "content-counter",
  genericErrorTestId: "error-form",
  genericError: {
    vi: "Không lưu được thay đổi, vui lòng thử lại.", // not from Figma
    en: "Couldn't save your changes, please try again.", // not from Figma
  },
} as const;

/** The counter text for n characters of Markdown. */
export const counterText = (n: number, locale: "vi" | "en") => (locale === "vi" ? `${n}/5.000` : `${n}/5,000`);

/** Code points of a Markdown string, as the server counts it (char_length). */
export const markdownLength = (markdown: string) => [...markdown].length;

export const UPDATE_RPC = "update_kudo";
export const READBACK_RPC = "kudo_detail";
