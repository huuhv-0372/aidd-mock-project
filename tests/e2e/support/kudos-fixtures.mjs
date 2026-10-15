// Test-only Kudos data for the fake Supabase (see fake-supabase-server.mjs). Shapes and catalogs mirror
// supabase/migrations/20261015100000_create_kudos.sql and lib/kudos/kudo-types.ts. Deterministic: no Date.now().
// The signed-in viewer is the placeholder key "viewer"; the server maps it to the JWT sub so is_mine and
// liked_by_me are right for whichever user the test mints.
// Callers: anonymous (no valid JWT) -> set RPCs [], kudos_spotlight null, kudos_my_stats [] (not-allowed shape).
//          EMPTY_USER_ID (allowed, no data) -> empty lists, spotlight zeros, one zero stats row.

export const EMPTY_USER_ID = "e0000000-0000-4000-8000-000000000000";
export const SYSTEM_KUDOS_TOTAL = 388; // spotlight total is system-wide and ignores filters

const TITLES = ["IDOL GIỚI TRẺ", "NGƯỜI TRUYỀN CẢM HỨNG", "CHIẾN BINH CÔNG NGHỆ", "ĐỒNG ĐỘI ĐÁNG TIN CẬY", "NGÔI SAO SÁNG TẠO"];
const CONTENTS = [
  "Cảm ơn bạn đã luôn sẵn sàng hỗ trợ đồng đội trong giai đoạn chạy nước rút. Sự tận tâm của bạn lan tỏa cả team.",
  "Buổi review code hôm qua thật sự hữu ích. Cách bạn giải thích từng vấn đề khiến mình hiểu sâu hơn rất nhiều.",
  "Cảm ơn bạn đã dành thời gian onboard cho các bạn mới. Mình học được rất nhiều từ tinh thần chia sẻ đó.",
  "Ý tưởng cải tiến quy trình của bạn giúp team tiết kiệm gần một nửa thời gian kiểm thử. Thật sự xuất sắc!",
  "Cảm ơn bạn vì đã kiên trì với dự án khách hàng khó nhất quý này. Chúc mừng thành quả của cả nhóm.",
  "Nụ cười và năng lượng tích cực của bạn mỗi sáng là động lực lớn cho cả phòng. Cảm ơn bạn nhiều!",
];
const GIFTS = [
  ["1 áo phông SAA", "1 SAA T-shirt"],
  ["1 bình giữ nhiệt SAA", "1 SAA thermos"],
  ["1 tai nghe Bluetooth", "1 Bluetooth headphones"],
];

// key -> [full_name, department code (from the migration's department list)]. Gift recipients are p01..p10.
export const PEOPLE = {
  p01: ["Huỳnh Dương Xuân Nhật", "CEVC1"], p02: ["Nguyễn Thị Minh Anh", "CEVC1"],
  p03: ["Trần Quốc Bảo", "CEVC2"], p04: ["Lê Hoàng Long", "CEVC2"],
  p05: ["Phạm Thu Hà", "CEVC4"], p06: ["Võ Anh Khoa", "CEVC4"],
  p07: ["Đặng Minh Quân", "STVC"], p08: ["Bùi Ngọc Hân", "STVC"],
  p09: ["Hoàng Gia Huy", "CEVC3"], p10: ["Đinh Thảo Vy", "CEVC3"],
  p11: ["Ngô Đức Mạnh", "OPDC - HRF"], p12: ["Phan Khánh Linh", "OPDC - HRF"],
  p13: ["Lý Tuấn Kiệt", "PAO"], p14: ["Trương Mỹ Duyên", "PAO"],
  p15: ["Dương Văn Tú", "FCOV"], p16: ["Vũ Hải Yến", "FCOV"],
  p17: ["Mai Đình Phúc", "CEVC1"], p18: ["Cao Thanh Trúc", "CEVC2"],
  p19: ["Tô Nhật Minh", "CEVC4"], p20: ["Hồ Gia Bảo", "STVC"],
  p21: ["Đoàn Phương Thảo", "PAO"], p22: ["Lương Quang Hiếu", "CEVC3"],
  p23: ["Châu Bảo Ngọc", "CEVC1"], p24: ["Kiều Thanh Tâm", "OPDC - HRF"],
  viewer: ["E2E User", "CEVC1"],
};

// Same 13 rows as the migration (slug, name_vi, name_en, sort_order).
export const HASHTAGS = [
  [1, "well-rounded", "Toàn diện", "Well-rounded"], [2, "professional", "Giỏi chuyên môn", "Professional"],
  [3, "high-performing", "Hiệu suất cao", "High-performing"], [4, "inspiring", "Truyền cảm hứng", "Inspiring"],
  [5, "dedicated", "Cống hiến", "Dedicated"], [6, "aim-high", "Aim High", "Aim High"],
  [7, "be-agile", "Be Agile", "Be Agile"], [8, "wasshoi", "Wasshoi", "Wasshoi"],
  [9, "goal-oriented", "Hướng mục tiêu", "Goal-oriented"], [10, "customer-focused", "Hướng khách hàng", "Customer-focused"],
  [11, "process-compliant", "Chuẩn quy trình", "Process-compliant"], [12, "creative-solutions", "Giải pháp sáng tạo", "Creative solutions"],
  [13, "excellent-management", "Quản lý xuất sắc", "Excellent management"],
].map(([id, slug, name_vi, name_en]) => ({ id, slug, name_vi, name_en, sort_order: id }));

// The 50 department codes of the migration, in sort order.
export const DEPARTMENTS = [
  "CTO", "SPD", "FCOV", "CEVC1", "CEVC2", "STVC - R&D", "CEVC2 - CySS", "FCOV - LRM", "CEVC2 - System", "OPDC - HRF",
  "CEVC1 - DSV - UI/UX 1", "CEVC1 - DSV", "CEVEC", "OPDC - HRD - C&C", "STVC", "FCOV - F&A", "CEVC1 - DSV - UI/UX 2",
  "CEVC1 - AIE", "OPDC - HRF - C&B", "FCOV - GA", "FCOV - ISO", "STVC - EE", "GEU - HUST", "CEVEC - SAPD", "OPDC - HRF - OD",
  "CEVEC - GSD", "GEU - TM", "STVC - R&D - DTR", "STVC - R&D - DPS", "CEVC3", "STVC - R&D - AIR", "CEVC4", "PAO", "GEU",
  "GEU - DUT", "OPDC - HRD - L&D", "OPDC - HRD - TI", "OPDC - HRF - TA", "GEU - UET", "STVC - R&D - SDX", "OPDC - HRD - HRBP",
  "PAO - PEC", "IAV", "STVC - Infra", "CPV - CGP", "GEU - UIT", "OPDC - HRD", "BDV", "CPV", "PAO - PAO",
].map((code, i) => ({ code, sort_order: i + 1 }));

// Kudo rows, newest first: [sender, recipient, title idx, hashtag slugs, heart_count, viewer liked, anonymous]
const ROWS = [
  ["viewer", "p01", 0, ["dedicated", "professional"], 12, false, false],
  ["p02", "viewer", 1, ["inspiring", "be-agile"], 9, true, false],
  ["p03", "p01", 2, ["creative-solutions"], 15, false, false],
  ["p04", "p05", 3, ["dedicated"], 7, false, false],
  ["p05", "p06", 4, ["creative-solutions", "process-compliant"], 4, false, true],
  ["p06", "viewer", 0, ["customer-focused"], 6, false, false],
  ["p07", "p08", 1, ["professional"], 3, false, false],
  ["p08", "p09", 2, ["high-performing", "excellent-management"], 11, false, false],
  ["p09", "p10", 3, ["dedicated", "aim-high"], 5, false, false],
  ["p10", "p11", 4, ["inspiring"], 2, false, false],
  ["p11", "p12", 0, ["customer-focused"], 8, false, false],
  ["p12", "p13", 1, ["wasshoi", "inspiring"], 10, false, false],
  ["p13", "p14", 2, ["process-compliant"], 1, false, false],
  ["p14", "viewer", 3, ["dedicated", "professional", "creative-solutions"], 14, false, false],
  ["p15", "p16", 4, ["creative-solutions"], 6, false, false],
  ["p16", "p17", 0, ["aim-high"], 4, false, false],
  ["p17", "p18", 1, ["professional"], 2, false, false],
  ["p18", "p19", 2, ["customer-focused", "dedicated"], 9, false, false],
  ["viewer", "p20", 3, ["high-performing"], 5, false, false],
  ["p20", "p21", 4, ["excellent-management"], 3, false, false],
  ["p21", "p22", 0, ["creative-solutions"], 7, false, false],
  ["p22", "p23", 1, ["goal-oriented", "inspiring"], 0, false, false],
  ["p23", "p24", 2, ["dedicated"], 2, false, false],
  ["p24", "p01", 3, ["professional"], 6, false, false],
  ["p01", "p15", 4, ["process-compliant"], 4, false, false],
  ["p05", "p17", 0, ["well-rounded", "high-performing"], 8, false, false],
  ["p09", "p04", 1, ["customer-focused"], 1, false, false],
  ["p19", "p02", 2, ["dedicated", "aim-high"], 5, false, false],
];

const BASE_MS = Date.parse("2026-10-14T10:00:00+07:00");
const kudoId = (i) => `c1000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
const personId = (key) => `2a000000-0000-4000-8000-0000000000${key.slice(1)}`; // key "pNN" only
const hashtagFor = (slug) => HASHTAGS.find((h) => h.slug === slug);

/** Fixture graph, built once. Newest first; created_at strictly decreasing (3h apart). */
export const KUDOS = ROWS.map(([sender, recipient, title, tags, heart_count, liked, anon], i) => ({
  id: kudoId(i),
  created_at: new Date(BASE_MS - i * 3 * 3600_000).toISOString(),
  title: TITLES[title],
  content: CONTENTS[i % CONTENTS.length],
  sender_key: sender,
  recipient_key: recipient,
  // Catalog order (sort_order), as the RPC returns them.
  hashtags: tags.map(hashtagFor).sort((a, b) => a.sort_order - b.sort_order),
  images: i % 9 === 0 ? [`/images/kudos/demo/kudo-photo-0${(i % 5) + 1}.jpg`] : [],
  heart_count,
  liked_by_viewer: liked,
  is_anonymous: anon,
  anonymous_name: anon ? "Đồng đội ẩn danh" : null,
}));

/** Person JSON (kudos_person_json). Counts are over the sample kudos; anonymous senders are not named. */
function personOf(key, sub) {
  const received = KUDOS.filter((k) => k.recipient_key === key);
  const senders = new Set(KUDOS.filter((k) => !k.is_anonymous && k.recipient_key === key).map((k) => k.sender_key));
  return {
    id: key === "viewer" ? sub : personId(key),
    full_name: PEOPLE[key][0],
    avatar_url: null,
    department: PEOPLE[key][1],
    kudos_received: received.length,
    distinct_senders: senders.size,
  };
}

/** Sidebar numbers for the signed-in viewer. Boxes come from secret_boxes (not derivable from kudos). */
export function viewerStats() {
  const sent = KUDOS.filter((k) => k.sender_key === "viewer");
  return {
    received: KUDOS.filter((k) => k.recipient_key === "viewer").length,
    sent: sent.length,
    hearts_received: sent.reduce((sum, k) => sum + k.heart_count, 0),
    boxes_opened: 4,
    boxes_unopened: 2,
  };
}

/** Kudo row in the KudoRow shape. Anonymous kudos expose sender = null. */
function rowFor(k, sub) {
  return {
    id: k.id,
    created_at: k.created_at,
    title: k.title,
    content: k.content,
    is_anonymous: k.is_anonymous,
    anonymous_name: k.anonymous_name,
    heart_count: k.heart_count,
    liked_by_me: Boolean(sub) && k.liked_by_viewer,
    is_mine: Boolean(sub) && k.sender_key === "viewer",
    sender: k.is_anonymous ? null : personOf(k.sender_key, sub),
    recipient: personOf(k.recipient_key, sub),
    hashtags: k.hashtags.map(({ slug, name_vi, name_en }) => ({ slug, name_vi, name_en })),
    images: k.images,
  };
}

const matches = (k, { p_hashtag, p_department }) =>
  (!p_hashtag || k.hashtags.some((h) => h.slug === p_hashtag))
  && (!p_department || PEOPLE[k.recipient_key][1] === p_department);

function feedPage({ p_hashtag, p_department, p_cursor_created_at, p_cursor_id, p_limit }, sub) {
  const limit = Math.min(Math.max(Number(p_limit) || 10, 1), 20);
  const cursorMs = p_cursor_created_at ? Date.parse(p_cursor_created_at) : null;
  return KUDOS.filter((k) => matches(k, { p_hashtag, p_department }))
    .filter((k) => {
      if (cursorMs === null) return true;
      const ms = Date.parse(k.created_at);
      return ms < cursorMs || (ms === cursorMs && k.id < p_cursor_id);
    })
    .slice(0, limit)
    .map((k) => rowFor(k, sub));
}

function highlight({ p_hashtag, p_department }, sub) {
  return KUDOS.filter((k) => matches(k, { p_hashtag, p_department }))
    .sort((a, b) => b.heart_count - a.heart_count || Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 5)
    .map((k) => rowFor(k, sub));
}

function spotlight(sub) {
  const byRecipient = new Map();
  for (const k of KUDOS) {
    const g = byRecipient.get(k.recipient_key);
    if (g) g.kudos_count += 1;
    else byRecipient.set(k.recipient_key, { kudos_count: 1, last: k });
  }
  return {
    total: SYSTEM_KUDOS_TOTAL,
    recipients: [...byRecipient].map(([key, g]) => ({
      id: personOf(key, sub).id,
      full_name: PEOPLE[key][0],
      kudos_count: g.kudos_count,
      last_received_at: g.last.created_at,
      last_kudo_id: g.last.id,
    })),
    recent: KUDOS.slice(0, 5).map((k) => ({ recipient_name: PEOPLE[k.recipient_key][0], created_at: k.created_at })),
  };
}

function latestGiftRecipients(limit, sub) {
  return Array.from({ length: Math.min(Number(limit) || 10, 10) }, (_, i) => {
    const [vi, en] = GIFTS[i % GIFTS.length];
    return {
      recipient: personOf(`p${String(i + 1).padStart(2, "0")}`, sub),
      gift_name_vi: vi,
      gift_name_en: en,
      awarded_at: new Date(BASE_MS - i * 86400_000).toISOString(),
    };
  });
}

const ZERO_STATS = { received: 0, sent: 0, hearts_received: 0, boxes_opened: 0, boxes_unopened: 0 };

/** Allowed caller with no data (EMPTY_USER_ID): empty lists, zero spotlight, one zero stats row. */
const EMPTY_FOR_ALLOWED = {
  kudos_feed: [],
  kudos_highlight: [],
  kudos_latest_gift_recipients: [],
  kudos_spotlight: { total: 0, recipients: [], recent: [] },
  kudos_my_stats: [ZERO_STATS],
};

/** Not-allowed caller (no valid JWT) per lib/kudos/kudo-types.ts. */
const EMPTY_FOR_ANONYMOUS = {
  kudos_feed: [],
  kudos_highlight: [],
  kudos_latest_gift_recipients: [],
  kudos_spotlight: null,
  kudos_my_stats: [],
};

/**
 * POST /rest/v1/rpc/<name>. Returns the JSON body (table/setof -> array, jsonb -> object) or undefined for
 * an unknown function.
 */
export function kudosRpc(name, body, sub) {
  if (!(name in EMPTY_FOR_ALLOWED)) return undefined;
  if (!sub) return structuredClone(EMPTY_FOR_ANONYMOUS[name]);
  if (sub === EMPTY_USER_ID) return structuredClone(EMPTY_FOR_ALLOWED[name]);
  switch (name) {
    case "kudos_feed": return feedPage(body, sub);
    case "kudos_highlight": return highlight(body, sub);
    case "kudos_spotlight": return spotlight(sub);
    case "kudos_my_stats": return [viewerStats()];
    case "kudos_latest_gift_recipients": return latestGiftRecipients(body.p_limit, sub);
    default: return undefined;
  }
}

/** GET /rest/v1/hashtags|departments: catalogs served to any caller. */
export function kudosCatalog(table) {
  if (table === "hashtags") return structuredClone(HASHTAGS);
  if (table === "departments") return structuredClone(DEPARTMENTS);
  return undefined;
}

/** Number of distinct recipients across the sample kudos (= spotlight node count). */
export const SPOTLIGHT_RECIPIENT_COUNT = new Set(KUDOS.map((k) => k.recipient_key)).size;

/** Kudo by id, for specs that need the fixture behind a rendered card. */
export const kudoById = (id) => KUDOS.find((k) => k.id === id);

/** A hashtag + department pair with no matching kudo, for the "filters combine to empty" case. */
export function emptyFilterCombo() {
  for (const h of HASHTAGS) {
    for (const d of DEPARTMENTS) {
      const hit = KUDOS.some((k) => matches(k, { p_hashtag: h.slug, p_department: d.code }));
      if (!hit) return { hashtag: h, department: d.code };
    }
  }
  throw new Error("fixture has no empty filter combination");
}

/** Department code of the recipient of the kudo with this id (the department filter's key). */
export function recipientDepartment(id) {
  const k = kudoById(id);
  if (!k) throw new Error(`no fixture kudo ${id}`);
  return PEOPLE[k.recipient_key][1];
}
