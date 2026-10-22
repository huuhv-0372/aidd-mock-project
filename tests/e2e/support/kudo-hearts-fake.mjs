// Test-only "set_kudo_heart" side of the Kudos fake (see fake-supabase-server.mjs). Mirrors the contract of the
// phase-02 SQL: {p_kudo_id, p_liked} SETS the viewer's like (idempotent, not a toggle) and answers [{liked, heart_count}];
// refusals are PostgREST 22023 with the short code as message, checked in the same order as the SQL: forbidden, not_found,
// own_kudo. The fake is a contract double; the migration owns the real guarantees.
// Isolation: heart state is keyed by the caller's JWT sub, so one test's likes never move another test's counts. The base
// counts come from kudos-fixtures.mjs (heart_count and liked_by_viewer); this file overlays the caller's own changes onto
// feed and highlight rows, so a reload shows what the RPC stored.
import { KUDOS } from "./kudos-fixtures.mjs";

const states = new Map(); // sub -> { liked: Map<kudoId, boolean>, calls: [{p_kudo_id, p_liked}], delayMs, failNext }
const stateOf = (sub) => {
  if (!states.has(sub)) states.set(sub, { liked: new Map(), calls: [], delayMs: 0, failNext: null });
  return states.get(sub);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fixtureOf = (id) => KUDOS.find((k) => k.id === id);
const refuse = (message) => ({ status: 400, body: { code: "22023", details: null, hint: null, message } });

/** This caller's view of one fixture kudo: base count moved by the caller's own like change (SQL: heart_count counts rows). */
function viewOf(k, state) {
  const liked = state.liked.has(k.id) ? state.liked.get(k.id) : k.liked_by_viewer;
  return { liked, heart_count: k.heart_count + Number(liked) - Number(k.liked_by_viewer) };
}

/** POST /rest/v1/rpc/set_kudo_heart. Every call is logged on arrival, so a test can see one in flight. */
export async function setKudoHeartRpc(body, sub) {
  const state = stateOf(sub || "anonymous");
  state.calls.push({ p_kudo_id: body.p_kudo_id, p_liked: body.p_liked });
  if (state.delayMs) await sleep(state.delayMs);
  if (!sub) return refuse("forbidden");
  const k = fixtureOf(body.p_kudo_id);
  if (!k || typeof body.p_liked !== "boolean") return refuse("not_found"); // SQL: null p_kudo_id / p_liked → not_found
  if (k.sender_key === "viewer") return refuse("own_kudo");
  if (state.failNext) { // one-shot: the next valid call fails, then the retry succeeds
    const code = state.failNext;
    state.failNext = null;
    if (code === "500") return { status: 500, body: { code: "XX000", details: null, hint: null, message: "fake: injected heart failure boom-secret-detail" } };
    return refuse(code);
  }
  state.liked.set(k.id, body.p_liked === true);
  return { status: 200, body: [viewOf(k, state)] };
}

/** Feed, Highlight and the View Kudo detail carry this caller's heart state (liked_by_me, heart_count). Other RPCs pass through. */
export function applyKudoHearts(name, sub, rows) {
  const state = sub ? states.get(sub) : undefined;
  if (!state || !Array.isArray(rows) || !["kudos_feed", "kudos_highlight", "kudo_detail"].includes(name)) return rows;
  return rows.map((row) => {
    const k = fixtureOf(row.id);
    if (!k) return row; // kudos created in the write flow carry no heart state in this fake
    const { liked, heart_count } = viewOf(k, state);
    return { ...row, liked_by_me: liked, heart_count };
  });
}

/**
 * Control endpoints (GET, keyed by ?sub=): /__kudo-heart-log (calls so far), /__kudo-heart-delay?ms= (holds every
 * set_kudo_heart answer by ms), /__kudo-heart-fail?code=500|forbidden|not_found|own_kudo (the next valid call fails once).
 */
export function kudoHeartControl(pathname, params) {
  if (!pathname.startsWith("/__kudo-heart-")) return undefined;
  const state = stateOf(params.get("sub") || "anonymous");
  if (pathname === "/__kudo-heart-log") return { calls: state.calls };
  if (pathname === "/__kudo-heart-delay") state.delayMs = Number(params.get("ms") || 0);
  else if (pathname === "/__kudo-heart-fail") state.failNext = params.get("code") || "500";
  return { ok: true };
}
