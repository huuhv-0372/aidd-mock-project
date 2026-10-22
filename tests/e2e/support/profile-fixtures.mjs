// Test-only profile page data for the fake Supabase (wired in fake-supabase-server.mjs). A CONTRACT DOUBLE of the phase-02b
// SQL, not the SQL itself (the migration owns the real guarantees):
//   profile_card(p_id)                                       -> kudos_person_json (one object), or null
//   kudos_profile_feed(p_profile, p_direction, cursor, limit) -> Kudo rows (KudoRow shape), newest first
// Rules, from plans/261021-profile/clarifications.md (Session 2 wins):
//   - guest: profile_card null, feed []. EMPTY_USER_ID (allowed, no data): a zero-count card for itself, feed [].
//   - 'received': Kudos whose recipient is that profile. 'sent': only when p_profile is the caller, anonymous ones included.
//     Any other profile, or any other direction: [].
//   - same keyset cursor, newest-first order and clampLimit(p_limit, 10) as the board's feedPage (kudos-fixtures.mjs).
// People and rows come from kudos-fixtures.mjs, so a profile and the board always agree on a person. The two profile-only
// people below live here, not in KUDOS or PEOPLE: no board RPC, count or Spotlight ever sees them.
import { EMPTY_USER_ID, HASHTAGS, KUDOS, PEOPLE, clampLimit, newestFirst, personId, personOf, rowFor } from "./kudos-fixtures.mjs";

// Not RFC 4122, like the rest of the fixture ids (see kudos-fixtures.mjs).
const BUSY_PROFILE_ID = "2a000000-0000-0000-0000-0000000000f1";
const SPARSE_PROFILE_ID = "2a000000-0000-0000-0000-0000000000f2";
const BUSY_NAME = "Đỗ Thanh Hằng";
const BUSY_DEPARTMENT = "CEVC2 - CySS";
const SPARSE_NAME = "Lâm Quốc Thái";
const BOARD_KEYS = Object.keys(PEOPLE).filter((key) => key !== "viewer");

// 13 Kudos received by the busy profile: two pages (10, then 3). Newest first. Row 2 is anonymous: its alias shows on the card
// and, as on the board, it is not counted in distinct_senders. No sender is the viewer, so the viewer's counts stay put.
const BASE_MS = Date.parse("2026-10-13T09:00:00+07:00");
const HOUR_MS = 3600_000;
const BUSY_SENDERS = ["p02", "p03", "p04", "p07", "p08", "p09", "p10", "p11", "p12", "p13", "p15", "p16", "p18"];
const BUSY_TITLES = ["IDOL GIỚI TRẺ", "NGƯỜI TRUYỀN CẢM HỨNG", "CHIẾN BINH CÔNG NGHỆ", "ĐỒNG ĐỘI ĐÁNG TIN CẬY", "NGÔI SAO SÁNG TẠO"];
const BUSY_ROWS = BUSY_SENDERS.map((sender, i) => ({
  id: `c2000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
  created_at: new Date(BASE_MS - i * 3 * HOUR_MS).toISOString(),
  title: BUSY_TITLES[i % BUSY_TITLES.length],
  content: `Lời cảm ơn thứ ${i + 1} gửi tới người đồng đội này.`,
  sender_key: sender,
  hashtags: [HASHTAGS[i % HASHTAGS.length]],
  images: [],
  heart_count: i % 5,
  hearts_awarded: i % 5,
  liked_by_viewer: false,
  is_anonymous: i === 2,
  anonymous_name: i === 2 ? "Đồng đội ẩn danh" : null,
}));

/** The busy profile (13 received Kudos), for the infinite-scroll case. kudoIds are in feed order (newest first). */
export const BUSY_PROFILE = { id: BUSY_PROFILE_ID, full_name: BUSY_NAME, department: BUSY_DEPARTMENT, kudoIds: BUSY_ROWS.map((k) => k.id) };
/** A profile with no avatar, no department and no Kudos at all. */
export const SPARSE_PROFILE = { id: SPARSE_PROFILE_ID, full_name: SPARSE_NAME };

const busyCard = () => ({
  id: BUSY_PROFILE_ID,
  full_name: BUSY_NAME,
  avatar_url: null,
  department: BUSY_DEPARTMENT,
  kudos_received: BUSY_ROWS.length,
  distinct_senders: new Set(BUSY_ROWS.filter((k) => !k.is_anonymous).map((k) => k.sender_key)).size,
});
const sparseCard = () => ({
  id: SPARSE_PROFILE_ID,
  full_name: SPARSE_NAME,
  avatar_url: null,
  department: null,
  kudos_received: 0,
  distinct_senders: 0,
});

// rowFor() resolves board people only, so the busy profile is put in as the recipient after rowFor has built the row.
const busyRow = (k, sub) => ({ ...rowFor({ ...k, recipient_key: "viewer" }, sub), recipient: busyCard() });

/** The caller's own card: the board's person, or a zero-count card when the caller is EMPTY_USER_ID. */
function selfCard(sub) {
  if (sub !== EMPTY_USER_ID) return personOf("viewer", sub);
  return {
    id: EMPTY_USER_ID,
    full_name: PEOPLE.viewer[0],
    avatar_url: null,
    department: PEOPLE.viewer[1],
    kudos_received: 0,
    distinct_senders: 0,
  };
}

/** profile_card(p_id): the caller's own card, the busy or sparse card, a board person's card, or null (guest, unknown id). */
function profileCard(pId, sub) {
  if (!sub) return null;
  if (pId === sub) return selfCard(sub);
  if (pId === BUSY_PROFILE_ID) return busyCard();
  if (pId === SPARSE_PROFILE_ID) return sparseCard();
  const key = BOARD_KEYS.find((k) => personId(k) === pId);
  return key ? personOf(key, sub) : null;
}

/** The Kudos behind one (profile, direction) pair as KudoRow objects, before the cursor is applied. */
function candidatesFor(pId, direction, sub) {
  if (direction === "received") {
    if (pId === sub) return KUDOS.filter((k) => k.recipient_key === "viewer").map((k) => rowFor(k, sub));
    if (pId === BUSY_PROFILE_ID) return BUSY_ROWS.map((k) => busyRow(k, sub));
    const key = BOARD_KEYS.find((b) => personId(b) === pId);
    return key ? KUDOS.filter((k) => k.recipient_key === key).map((k) => rowFor(k, sub)) : [];
  }
  if (direction === "sent" && pId === sub) return KUDOS.filter((k) => k.sender_key === "viewer").map((k) => rowFor(k, sub));
  return [];
}

/** kudos_profile_feed(...): one keyset page of candidatesFor(), newest first. Same cursor and limit rules as the board's feedPage. */
function profileFeedPage({ p_profile, p_direction, p_cursor_created_at, p_cursor_id, p_limit }, sub) {
  if (!sub || sub === EMPTY_USER_ID) return [];
  // Like the SQL, the cursor applies only when both halves are present.
  const cursorMs = p_cursor_created_at && p_cursor_id ? Date.parse(p_cursor_created_at) : null;
  return candidatesFor(p_profile, p_direction, sub)
    .filter((row) => {
      if (cursorMs === null) return true;
      const ms = Date.parse(row.created_at);
      return ms < cursorMs || (ms === cursorMs && row.id < p_cursor_id);
    })
    .sort(newestFirst)
    .slice(0, clampLimit(p_limit, 10));
}

/** The two profile RPCs. Undefined for any other name, so the board's dispatch answers that one. */
export function profileRpc(name, body, sub) {
  if (name === "profile_card") return profileCard(body.p_id, sub);
  if (name === "kudos_profile_feed") return profileFeedPage(body, sub);
  return undefined;
}
