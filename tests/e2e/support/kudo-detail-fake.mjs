// Test-only "kudo_detail" modes of the Kudos fake (see fake-supabase-server.mjs). The real RPC hides the sender of an
// anonymous Kudo, so a mode makes it misbehave on purpose, to prove the page does not depend on the RPC alone.
// Isolation: keyed by the caller's JWT sub, like the heart fake.
//   leak-sender : an anonymous Kudo still carries a populated `sender` (the page must still hide it)
//   own-anon    : the Kudo the viewer sent (fixture KUDOS[0]) is anonymous, so is_mine and is_anonymous are both true
import { KUDOS, PEOPLE, personIdFor } from "./kudos-fixtures.mjs";

const modes = new Map(); // sub -> mode
const fixtureOf = (id) => KUDOS.find((k) => k.id === id);
const ANONYMOUS_NAME = "Đồng đội ẩn danh";

/** The sender of a fixture Kudo as the RPC's person JSON would carry it (what a leak exposes). */
function senderJson(key, sub) {
  return {
    id: key === "viewer" ? sub : personIdFor(key),
    full_name: PEOPLE[key][0],
    avatar_url: null,
    department: PEOPLE[key][1],
    kudos_received: 1,
    distinct_senders: 1,
  };
}

/** Applies this caller's mode to kudo_detail rows; every other RPC and every caller without a mode passes through. */
export function applyKudoDetailMode(name, sub, rows) {
  const mode = sub ? modes.get(sub) : undefined;
  if (!mode || name !== "kudo_detail" || !Array.isArray(rows)) return rows;
  return rows.map((row) => {
    const k = fixtureOf(row.id);
    if (!k) return row;
    if (mode === "leak-sender" && row.is_anonymous) return { ...row, sender: senderJson(k.sender_key, sub) };
    if (mode === "own-anon" && k.sender_key === "viewer") {
      return { ...row, is_anonymous: true, anonymous_name: ANONYMOUS_NAME, sender: null };
    }
    return row;
  });
}

/** GET /__kudo-detail-mode?sub=<sub>&mode=leak-sender|own-anon|off. Undefined for any other path. */
export function kudoDetailControl(pathname, params) {
  if (pathname !== "/__kudo-detail-mode") return undefined;
  const sub = params.get("sub") || "anonymous";
  const mode = params.get("mode");
  if (!mode || mode === "off") modes.delete(sub);
  else modes.set(sub, mode);
  return { ok: true };
}
