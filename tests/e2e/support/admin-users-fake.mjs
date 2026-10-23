// Test-only admin side of the fake Supabase (wired in fake-supabase-server.mjs). A CONTRACT DOUBLE of the phase-02b SQL
// (is_admin, admin_list_users, admin_set_user_role), not the SQL. The migration and the phase-03 SQL verify own the real guarantees.
// Rules mirrored (plans/261023-1207-admin-user-management/clarifications.md + phase-02b):
//   - non-admin caller: is_admin false, admin_list_users [] (0 rows, no error), admin_set_user_role 'forbidden'.
//   - filters unit/level/role; search: case-insensitive substring of name or email, % _ \ are literal characters.
//   - sort keys sent|received|hearts|level|badges|time6|last_login; a NULL is always last; ties by created_at then id.
//     Default order (no sort key): created_at ascending.
//   - row_no = position in the whole filtered + sorted result (before limit/offset); total_count, sum_sent, sum_received are window
//     totals over the filtered result. limit clamped to 1..5000, offset >= 0.
//   - admin_set_user_role order: forbidden -> self -> invalid -> not_found -> ok.
// Isolation: each caller (JWT sub) has its own world (role, role changes, injected failures, set-role log), so parallel tests
// never share state. Controls are GET endpoints keyed by ?sub= (see adminControl).
import { ADMIN_PEOPLE, CALLER_EMAIL, CALLER_NAME, CALLER_ROW, levelOf } from "./admin-users-dataset.mjs";

const worlds = new Map();
const worldOf = (sub) => {
  if (!worlds.has(sub)) worlds.set(sub, { role: "user", roles: new Map(), failNext: null, listFail: false, calls: [] });
  return worlds.get(sub);
};
const callerIsAdmin = (sub) => Boolean(sub) && worldOf(sub).role === "admin";
const roleOf = (person, world) => world.roles.get(person.user_id) ?? person.role;
const ok = (body) => ({ status: 200, body });
const injected = (message) => ({ status: 500, body: { code: "XX000", details: null, hint: null, message } });

/** The caller's rows before filters: the caller's own row (admin) and the fixed people with this caller's role changes. */
function visibleRows(sub, world) {
  const people = ADMIN_PEOPLE.map((p) => ({ ...p, role: roleOf(p, world) }));
  const caller = {
    user_id: sub, full_name: CALLER_NAME, email: CALLER_EMAIL, department: "CEVC1", ...CALLER_ROW, role: "admin",
  };
  return [caller, ...people];
}

const SORT_VALUE = {
  sent: (r) => r.sent,
  received: (r) => r.received,
  hearts: (r) => r.hearts,
  level: (r) => levelOf(r.distinct),
  badges: (r) => r.badges,
  time6: (r) => r.time6,
  last_login: (r) => r.lastSignIn,
};

/** Order of the SQL: sort key (NULL last in both directions), then created_at, then id; unknown keys fall back to the default. */
function comparatorFor(sortKey, dir) {
  const value = SORT_VALUE[sortKey];
  return (a, b) => {
    if (value) {
      const va = value(a);
      const vb = value(b);
      if (va === null || vb === null) {
        if (va !== vb) return va === null ? 1 : -1;
      } else if (va !== vb) {
        const d = typeof va === "string" ? (va < vb ? -1 : 1) : va - vb;
        return dir === "asc" ? d : -d;
      }
    }
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0;
  };
}

function listUsers(body, sub) {
  if (!callerIsAdmin(sub)) return [];
  const world = worldOf(sub);
  const term = (body.p_search ?? "").trim().toLowerCase();
  const filtered = visibleRows(sub, world).filter((r) =>
    (!body.p_department || r.department === body.p_department) &&
    (body.p_level == null || levelOf(r.distinct) === Number(body.p_level)) &&
    (!body.p_role || r.role === body.p_role) &&
    (!term || r.full_name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)));
  const sorted = filtered.sort(comparatorFor(body.p_sort ?? null, body.p_dir === "asc" ? "asc" : "desc"));
  const rawLimit = body.p_limit == null ? 20 : Number(body.p_limit);
  const limit = Math.min(Math.max(rawLimit, 1), 5000);
  const offset = Math.max(body.p_offset == null ? 0 : Number(body.p_offset), 0);
  const total = sorted.length;
  const sumSent = sorted.reduce((s, r) => s + r.sent, 0);
  const sumReceived = sorted.reduce((s, r) => s + r.received, 0);
  return sorted
    .map((r, i) => ({
      user_id: r.user_id,
      row_no: i + 1,
      full_name: r.full_name,
      email: r.email,
      department: r.department,
      sent: r.sent,
      received: r.received,
      hearts: r.hearts,
      level: levelOf(r.distinct),
      badges: r.badges,
      time_to_6_badges: r.time6,
      last_sign_in_at: r.lastSignIn,
      role: r.role,
      total_count: total,
      sum_sent: sumSent,
      sum_received: sumReceived,
    }))
    .slice(offset, offset + limit);
}

/** admin_set_user_role(p_user_id, p_role) -> text. Every call is logged, so a test can assert "no call" on cancel. */
function setRole(body, sub) {
  const world = sub ? worldOf(sub) : null;
  if (world) world.calls.push({ p_user_id: body.p_user_id, p_role: body.p_role });
  if (!world || world.role !== "admin") return ok("forbidden");
  if (world.failNext) {
    const code = world.failNext;
    world.failNext = null;
    return code === "server" ? injected("fake: injected role failure boom-secret-detail") : ok(code);
  }
  if (body.p_user_id === sub) return ok("self");
  if (body.p_role !== "user" && body.p_role !== "admin") return ok("invalid");
  if (!ADMIN_PEOPLE.some((p) => p.user_id === body.p_user_id)) return ok("not_found");
  world.roles.set(body.p_user_id, body.p_role);
  return ok("ok");
}

/** RPC dispatch for the admin functions. Undefined for any other name, so the rest of the fake answers it. */
export function adminRpc(name, body, sub) {
  if (name === "is_admin") return ok(callerIsAdmin(sub));
  if (name === "admin_list_users") {
    if (sub && worldOf(sub).listFail) return injected("fake: injected list failure boom-secret-detail");
    return ok(listUsers(body, sub));
  }
  if (name === "admin_set_user_role") return setRole(body, sub);
  return undefined;
}

/**
 * Control endpoints (GET, keyed by ?sub=):
 *   /__admin-mode?sub=&role=admin|user   the caller's role (default user); &reset=1 forgets this caller's world
 *   /__admin-role-fail?sub=&code=forbidden|not_found|server   the next set-role call fails once with this answer
 *   /__admin-role-log?sub=               every set-role call so far ({p_user_id, p_role})
 *   /__admin-list-fail?sub=&on=1|0       the list RPC answers 500 for this caller until switched off
 */
export function adminControl(pathname, params) {
  if (!pathname.startsWith("/__admin-")) return undefined;
  const sub = params.get("sub");
  if (!sub) return { error: "sub is required" };
  const world = worldOf(sub);
  switch (pathname) {
    case "/__admin-mode":
      if (params.get("reset") === "1") {
        worlds.delete(sub);
        return { reset: true };
      }
      world.role = params.get("role") === "admin" ? "admin" : "user";
      return { role: world.role };
    case "/__admin-role-fail":
      world.failNext = params.get("code");
      return { armed: world.failNext };
    case "/__admin-role-log":
      return { calls: world.calls };
    case "/__admin-list-fail":
      world.listFail = params.get("on") === "1";
      return { listFail: world.listFail };
    default:
      return undefined;
  }
}
