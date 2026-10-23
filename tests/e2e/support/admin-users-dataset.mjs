// Test-only people for the Admin - User screen (plans/261023-1207-admin-user-management). Deterministic: no Date.now().
// 44 fixed people + the caller's own row (added per caller in admin-users-fake.mjs, only when the caller is an admin) = 45 rows,
// i.e. pages of 20, 20 and 5. Emails are fake (@sun-asterisk.com). Ids are not RFC 4122 v4 (zod z.guid accepts them, z.uuid does not).
// Level = hero tier of distinct senders (clarifications, decision 1): 0 | 1-4 | 5-9 | 10-20 | >=21.

export const DEPARTMENTS_IN_USE = ["CEVC1", "CEVC2", "CEVC3"];
export const CALLER_EMAIL = "e2e@sun-asterisk.com";
export const CALLER_NAME = "E2E Quản Trị";
/** Caller's own row values (an admin with two distinct senders, six badges). */
export const CALLER_ROW = {
  sent: 3,
  received: 2,
  hearts: 10,
  distinct: 2,
  badges: 6,
  time6: "2026-09-25T04:00:00.000Z",
  lastSignIn: "2026-10-23T01:00:00.000Z",
  createdAt: "2025-06-01T00:00:00.000Z", // earliest, so the caller is row 1 in the default order
};

export const levelOf = (distinct) => (distinct <= 0 ? 0 : distinct <= 4 ? 1 : distinct <= 9 ? 2 : distinct <= 20 ? 3 : 4);

const SURNAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
const MIDDLES = ["Văn", "Thị", "Minh", "Hữu", "Ngọc"];
const GIVEN = ["An", "Bình", "Chi", "Dũng", "Hà", "Khánh", "Linh", "Mai", "Nam", "Phong", "Quyên", "Sơn", "Thảo", "Tuấn", "Uyên", "Vy"];
// Cycles through every level and each tier boundary (0, 1, 4, 5, 9, 10, 20, 21).
const DISTINCT_CYCLE = [0, 1, 4, 5, 9, 10, 20, 21, 7, 15];
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const BASE_MS = Date.parse("2026-01-05T00:00:00+07:00");

const iso = (ms) => new Date(ms).toISOString();
const idOf = (n) => `a1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const ascii = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

/** Hand-picked people. Values here are facts the specs check by name, so change them only together with the specs. */
const SPECIAL = {
  // Long email; Vietnam-time dates: last sign-in 2026-10-05 09:30, six badges with time 2026-09-20 15:15.
  0: {
    full_name: "Nguyễn Thị Phương Anh",
    email: "nguyen.thi.phuong.anh.quan.ly.du.an@sun-asterisk.com",
    badges: 6,
    time6: "2026-09-20T08:15:00.000Z",
    lastSignIn: "2026-10-05T02:30:00.000Z",
  },
  1: { full_name: "Lê Hữu Quản Trị", email: "le.huu.quan.tri@sun-asterisk.com", role: "admin" }, // the second admin
  // Formula-injection names: the CSV must prefix each with an apostrophe.
  2: { full_name: "=1+1 Hoàng Đức", email: "injection.eq@sun-asterisk.com" },
  3: { full_name: "+1 Phạm Bảo", email: "injection.plus@sun-asterisk.com" },
  4: { full_name: "-1 Đặng Ngọc", email: "injection.minus@sun-asterisk.com" },
  5: { full_name: "@x Vũ Khánh", email: "injection.at@sun-asterisk.com" },
  // A comma and quotes in the name: the CSV must wrap and double them.
  6: { full_name: 'Bùi, "Bé" Minh', email: "bui.be.minh@sun-asterisk.com" },
  // Never signed in and fewer than six badges: both "last login" and "time to 6 badges" show "-".
  10: { lastSignIn: null },
};

function basePerson(i) {
  const special = SPECIAL[i] || {};
  const name = special.full_name ?? `${SURNAMES[i % 12]} ${MIDDLES[i % 5]} ${GIVEN[(i * 3) % 16]}`;
  const badges = i % 7;
  const person = {
    user_id: idOf(i + 1),
    full_name: name,
    email: special.email ?? `${ascii(name)}.${String(i).padStart(2, "0")}@sun-asterisk.com`,
    department: DEPARTMENTS_IN_USE[i % 3],
    sent: (i * 7) % 31,
    received: (i * 11) % 29,
    hearts: (i * 5) % 101,
    distinct: DISTINCT_CYCLE[i % DISTINCT_CYCLE.length],
    badges,
    time6: badges === 6 ? iso(BASE_MS + i * 5 * HOUR_MS) : null,
    lastSignIn: iso(Date.UTC(2026, 9, 1) + i * 7 * HOUR_MS),
    role: "user",
    createdAt: iso(BASE_MS + i * DAY_MS),
  };
  return { ...person, ...special };
}

/** The 44 fixed people, in default order after the caller (created_at ascending). */
export const ADMIN_PEOPLE = Array.from({ length: 44 }, (_, i) => basePerson(i));

/** Totals of the 45 rows an admin sees (fixed people + the caller): what the "(N)" sums and the total must show. */
export const ADMIN_TOTALS = {
  total: 45,
  sent: ADMIN_PEOPLE.reduce((s, p) => s + p.sent, 0) + CALLER_ROW.sent,
  received: ADMIN_PEOPLE.reduce((s, p) => s + p.received, 0) + CALLER_ROW.received,
  adminCount: 2, // the caller and person 1
  // Fixture facts the filter spec asserts (computed from the list above; the caller is in department CEVC1 and level 1).
  unitCevc2: ADMIN_PEOPLE.filter((p) => p.department === "CEVC2").length,
  level4: ADMIN_PEOPLE.filter((p) => levelOf(p.distinct) === 4).length,
};
