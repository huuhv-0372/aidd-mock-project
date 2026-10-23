// Test-only write side of the Kudos fake Supabase (see fake-supabase-server.mjs): create_kudo, kudos_search_sunners,
// Storage bucket "kudo-images", and per-caller control/log endpoints. It mirrors the SQL rules of phase 02
// (supabase/migrations/20261019110000_create_kudo_write.sql) one to one, in the same check order, with PostgREST-shaped
// errors (HTTP 400, code 22023, message = short code). Lesson #11: a lenient fake hides real SQL leaks, so keep it strict.
// The fake is a CONTRACT double, not proof of the SQL: the migration owns the real guarantees (caller excluded, RLS, ownership)
// and the SQL verify against a real database is what proves them. The fake only makes a UI that forgets to filter or mis-sends
// fail here the way it would against that SQL.
// Isolation: created kudos, uploads and logs are keyed by the caller's JWT sub, so a test never shows up in another
// test's feed (other specs count the 28 base kudos). Ids are NOT RFC 4122 v4 (zod z.guid lesson).
import { randomUUID } from "node:crypto";
import { HASHTAGS, KUDOS, PEOPLE } from "./kudos-fixtures.mjs";

const BUCKET = "kudo-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BASE_FLOOR_MS = Date.parse("2026-10-15T00:00:00+07:00"); // newer than every base kudo (newest 2026-10-14)
// Same shape as create_kudo's regex: scheme://host/storage/v1/object/public/kudo-images/{uuid}.{ext}, capture = object name.
const IMAGE_URL = new RegExp(`^https?://[^/?#@\\s]+/storage/v1/object/public/${BUCKET}/([0-9a-f-]{36}\\.(?:jpg|png|webp))$`);
const sunnerId = (n) => `2a000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

/** Postgres unaccent + lower (đ is not decomposed by NFD). */
const fold = (s) => String(s).toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/\p{M}/gu, "");
const chars = (s) => [...String(s)].length; // char_length counts code points
/** Company address of a fixture Sunner: folded name, dots between words ("Nguyễn Văn An" -> nguyen.van.an@sun-asterisk.com). */
export const sunnerEmail = (fullName) => `${fold(fullName).trim().split(/\s+/).join(".")}@sun-asterisk.com`;

/** Searchable Sunners: the 24 base people + extras (name search, "Nguyễn Văn An", >10 matches for the limit case). */
export const SUNNERS = [
  ...Object.entries(PEOPLE).filter(([key]) => key !== "viewer")
    .map(([key, [full_name, department]]) => ({ id: sunnerId(Number(key.slice(1))), full_name, avatar_url: null, department })),
  { id: sunnerId(101), full_name: "Nguyễn Văn An", avatar_url: null, department: "CEVC1" },
  { id: sunnerId(102), full_name: "Nguyễn Văn Bình", avatar_url: null, department: "CEVC2" },
  { id: sunnerId(103), full_name: "Trần Văn An", avatar_url: null, department: "STVC" },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: sunnerId(110 + i), full_name: `Sunner Tester ${String(i + 1).padStart(2, "0")}`, avatar_url: null, department: "CEVC3",
  })),
];
export const sunnerIdByName = (name) => SUNNERS.find((s) => s.full_name === name)?.id;
// Searchable like profiles.email, but kept out of the SUNNERS objects: those are spread into feed JSON, which never carries email.
const EMAILS = new Map(SUNNERS.map((s) => [s.id, sunnerEmail(s.full_name)]));
const SELF = { full_name: "E2E User", avatar_url: null, department: "CEVC1" }; // the signed-in caller (id = JWT sub)
const SELF_EMAIL = "e2e@sun-asterisk.com"; // same as EMAIL in fake-supabase-server.mjs (the caller's profile email)

const CREATED = []; // { id, created_at, sender_sub, recipient, title, content, hashtags, images, anon, alias }
const states = new Map();
const objects = new Map(); // flat "<uuid>.<ext>" -> { owner, bytes, mime }; owner = the upload's JWT sub (storage.objects.owner_id)
const stateOf = (sub) => {
  if (!states.has(sub)) {
    states.set(sub, {
      rpc: [], uploads: [], deletes: [], failRpc: false, refuseOnce: null, delayMs: 0, searchDelayMs: 0, failHashtags: false, hashtagDelayMs: 0,
      failUpdate: false, refuseUpdateOnce: null, // update_kudo: generic 500 while on / one 22023 refusal (edit-kudo.spec.ts)
    });
  }
  return states.get(sub);
};
const pgError = (message, status = 400, code = "22023") => ({ status, body: { code, details: null, hint: null, message } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findRecipient(id, sub) {
  if (id === sub) return { id: sub, ...SELF };
  return SUNNERS.find((s) => s.id === id);
}

function personJson(p, sub) {
  const key = Object.keys(PEOPLE).find((k) => k !== "viewer" && sunnerId(Number(k.slice(1))) === p.id);
  const received = KUDOS.filter((k) => (p.id === sub ? k.recipient_key === "viewer" : k.recipient_key === key));
  const senders = new Set(received.filter((k) => !k.is_anonymous).map((k) => k.sender_key));
  return { ...p, kudos_received: received.length, distinct_senders: senders.size };
}

function searchSunners({ p_query, p_limit, p_name_only }, sub) {
  if (!sub) return [];
  const q = fold(String(p_query ?? "").trim());
  const nameOnly = p_name_only === true;
  const limit = Math.min(Math.max(Number(p_limit ?? 10) || 1, 1), 10);
  // Like profiles: the caller is a searchable row too ("E2E User", e2e@...) and the SQL drops it with `p.id <> v_uid`.
  // Keeping it in the domain makes "never the signed-in user" a rule this fake enforces, not an accident of the data.
  const emailOf = (s) => (s.id === sub ? SELF_EMAIL : EMAILS.get(s.id));
  const domain = [...SUNNERS, { id: sub, ...SELF }].filter((s) => s.id !== sub);
  // SQL: blank query -> Sunners that have a name, by full_name then id. Otherwise name (accent-insensitive) OR, unless
  // p_name_only ("@ + tên"), email substring; order = exact email first (never under p_name_only), then full_name, then id.
  const exact = (s) => !nameOnly && emailOf(s) === q;
  const hit = (s) => (q ? fold(s.full_name).includes(q) || (!nameOnly && emailOf(s).includes(q)) : Boolean(s.full_name?.trim()));
  return domain.filter(hit)
    .sort((a, b) => Number(exact(b)) - Number(exact(a)) || a.full_name.localeCompare(b.full_name, "vi") || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(({ id, full_name, avatar_url, department }) => ({ id, full_name, avatar_url, department })); // never email
}

/** A flat `{uuid}.{ext}` object owned by this JWT sub (owner_id, never the path: an anonymous image URL must not name the sender). */
const ownedBy = (url, sub) => {
  const m = IMAGE_URL.exec(String(url));
  return Boolean(m) && objects.get(m[1])?.owner === sub;
};

/** Title, content, hashtags and images: the rules create_kudo and update_kudo share, in the SQL's order. */
function checkCommon(p, imageOk) {
  const title = String(p.p_title ?? "").trim();
  if (chars(title) < 1 || chars(title) > 100) return "invalid_title";
  const content = String(p.p_content ?? "");
  if (!content.trim() || chars(content) > 5000) return "invalid_content";
  const slugs = Array.isArray(p.p_hashtag_slugs) ? p.p_hashtag_slugs : [];
  if (slugs.length < 1 || slugs.length > 5 || new Set(slugs).size !== slugs.length
    || !slugs.every((s) => HASHTAGS.some((h) => h.slug === s))) return "invalid_hashtags";
  const urls = Array.isArray(p.p_image_urls) ? p.p_image_urls : [];
  if (urls.length > 5 || new Set(urls).size !== urls.length || !urls.every(imageOk)) return "invalid_images";
  return null;
}

/** The alias rule: only an anonymous Kudo carries one, at most 50 characters (blank = the default label). */
function aliasCode(p, anonymous) {
  if (!anonymous && p.p_anonymous_name != null) return "invalid_alias";
  if (anonymous && chars(String(p.p_anonymous_name ?? "").trim()) > 50) return "invalid_alias";
  return null;
}

function validate(p, sub) {
  if (!sub) return "forbidden";
  const recipient = findRecipient(p.p_recipient_id, sub);
  if (!recipient || recipient.id === sub) return "invalid_recipient";
  return checkCommon(p, (url) => ownedBy(url, sub)) ?? aliasCode(p, Boolean(p.p_is_anonymous));
}

async function createKudo(p, sub) {
  const state = stateOf(sub || "anonymous");
  if (state.delayMs) await sleep(state.delayMs);
  const code = validate(p, sub);
  if (code) return pgError(code);
  if (state.refuseOnce) { // the DB refuses a field the client had accepted, once (/__kudo-refuse-once?code=invalid_hashtags)
    const refused = state.refuseOnce;
    state.refuseOnce = null;
    return pgError(refused);
  }
  if (state.failRpc) return pgError("fake: injected failure boom-secret-detail", 500, "XX000");
  const id = `c2000000-0000-0000-0000-${String(CREATED.length + 1).padStart(12, "0")}`;
  const alias = p.p_is_anonymous ? String(p.p_anonymous_name ?? "").trim() || null : null;
  CREATED.push({
    id, sender_sub: sub, created_at: new Date(Math.max(Date.now(), BASE_FLOOR_MS) + CREATED.length).toISOString(),
    recipient: findRecipient(p.p_recipient_id, sub), title: String(p.p_title).trim(), content: p.p_content,
    hashtags: HASHTAGS.filter((h) => p.p_hashtag_slugs.includes(h.slug)), images: p.p_image_urls ?? [],
    anon: Boolean(p.p_is_anonymous), alias,
  });
  return { status: 200, body: id };
}

/** POST /rest/v1/rpc/<fn> for the write RPCs; undefined = not mine. Every call is logged per caller. */
export async function writeKudoRpc(name, body, sub) {
  if (name === "kudo_detail") return createdDetail(body.p_id, sub); // a read, not logged; undefined falls through to the board's RPCs
  if (name !== "create_kudo" && name !== "kudos_search_sunners" && name !== "update_kudo") return undefined;
  const state = stateOf(sub || "anonymous");
  state.rpc.push({ name, body }); // logged on arrival: a test can see a call in flight while its answer is still held back
  if (name === "create_kudo") return createKudo(body, sub);
  if (name === "update_kudo") return updateKudo(body, sub);
  if (state.searchDelayMs) await sleep(state.searchDelayMs);
  return { status: 200, body: searchSunners(body, sub) };
}

const rowOf = (k, sub) => ({
  id: k.id, created_at: k.created_at, title: k.title, content: k.content, is_anonymous: k.anon, anonymous_name: k.alias,
  heart_count: k.heart_count ?? 0, liked_by_me: false, is_mine: k.sender_sub === sub,
  sender: k.anon ? null : personJson({ id: k.sender_sub, ...SELF }, sub), recipient: personJson(k.recipient, sub),
  hashtags: k.hashtags.map(({ slug, name_vi, name_en }) => ({ slug, name_vi, name_en })), images: k.images,
});

// SQL: sender_id = auth.uid() AND the Kudo exists, else the same not_found; the alias and image rules are the create ones.
function updateKudo(p, sub) {
  if (!sub) return pgError("forbidden", 403, "42501");
  const id = String(p.p_id ?? "").toLowerCase();
  const k = CREATED.find((c) => c.id === id && c.sender_sub === sub);
  if (!k) return pgError("not_found");
  const imageOk = (url) => k.images.includes(url) || ownedBy(url, sub); // a Kudo's own image, or one this caller uploaded
  const code = checkCommon(p, imageOk) ?? aliasCode(p, k.anon);
  if (code) return pgError(code);
  const state = stateOf(sub);
  if (state.refuseUpdateOnce) { // the DB refuses a field the client had accepted, once (/__kudo-refuse-update-once?code=)
    const refused = state.refuseUpdateOnce;
    state.refuseUpdateOnce = null;
    return pgError(refused);
  }
  if (state.failUpdate) return pgError("fake: injected update failure boom-secret-detail", 500, "XX000");
  const urls = p.p_image_urls ?? [];
  const removed = k.images.filter((url) => !urls.includes(url)); // returned like the SQL: the URLs the Kudo no longer has
  Object.assign(k, {
    title: String(p.p_title).trim(), content: p.p_content, images: urls,
    hashtags: HASHTAGS.filter((h) => p.p_hashtag_slugs.includes(h.slug)),
    alias: k.anon ? String(p.p_anonymous_name ?? "").trim() || null : null,
  });
  return { status: 200, body: removed };
}

// kudo_detail read-back of a Kudo this fake created (the update action re-reads its row through it). Undefined = not one of ours.
function createdDetail(pId, sub) {
  const k = CREATED.find((c) => c.id === String(pId).toLowerCase());
  if (!k) return undefined;
  return { status: 200, body: sub ? [rowOf(k, sub)] : [] };
}

const SEED_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
/** Markdown the edit modal must reproduce byte for byte when nothing is changed (bold, italic, a mention, a link). */
export const EDIT_SEED_CONTENT = [
  "Cảm ơn **bạn** rất nhiều vì đã _luôn_ hỗ trợ cả team trong quý này.",
  "Cảm ơn @[Nguyễn Thị Minh Anh](2a000000-0000-0000-0000-000000000002) đã đồng hành cùng mình. Xem thêm [tài liệu nội bộ](https://example.com/guide) nhé.",
].join("\n");
export const EDIT_SEED_TITLE = "NGƯỜI TRUYỀN CẢM HỨNG";
export const EDIT_SEED_RECIPIENT = "Nguyễn Văn An";
export const EDIT_SEED_HASHTAGS = ["dedicated", "professional"];
export const EDIT_SEED_HEARTS = 7;

/**
 * An own Kudo of the caller for the edit tests (GET /__kudo-seed-own?sub=&anon=1&alias=): three PNG objects owned by the caller
 * (their names are random, so parallel tests never share an object), the EDIT_SEED_* content, and a heart count the save must keep.
 * It lists first on the caller's board, as a just-created Kudo does.
 */
export function seedOwnKudo(sub, { anonymous = false, alias = null } = {}) {
  const images = Array.from({ length: 3 }, () => {
    const name = `${randomUUID()}.png`;
    objects.set(name, { owner: sub, bytes: SEED_PNG, mime: "image/png" });
    return `http://127.0.0.1:54398/storage/v1/object/public/${BUCKET}/${name}`;
  });
  const id = `c3000000-0000-0000-0000-${String(CREATED.length + 1).padStart(12, "0")}`;
  const recipient = SUNNERS.find((s) => s.full_name === EDIT_SEED_RECIPIENT);
  const created_at = new Date(Math.max(Date.now(), BASE_FLOOR_MS) + CREATED.length).toISOString();
  const kudo = {
    id, sender_sub: sub, created_at, recipient, title: EDIT_SEED_TITLE, content: EDIT_SEED_CONTENT,
    hashtags: HASHTAGS.filter((h) => EDIT_SEED_HASHTAGS.includes(h.slug)), images, anon: anonymous,
    alias: anonymous ? alias : null, heart_count: EDIT_SEED_HEARTS,
  };
  CREATED.push(kudo);
  return { id, title: kudo.title, content: kudo.content, images, anonymous, alias: kudo.alias, heartCount: EDIT_SEED_HEARTS, createdAt: created_at };
}

/** The caller's own new kudos lead page 1 of kudos_feed (they are newer than every base kudo). */
export function mergeCreatedKudos(name, body, sub, rows) {
  if (name !== "kudos_feed" || !sub || (body.p_cursor_created_at && body.p_cursor_id)) return rows;
  const mine = CREATED.filter((k) => k.sender_sub === sub
    && (!body.p_hashtag || k.hashtags.some((h) => h.slug === body.p_hashtag))
    && (!body.p_department || k.recipient.department === body.p_department))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));
  return [...mine.map((k) => rowOf(k, sub)), ...rows].slice(0, Math.min(Math.max(Number(body.p_limit ?? 10) || 1, 1), 20));
}

/** True while this caller's hashtag catalog read must answer 500 (the server action getHashtagOptions reads it). */
export const hashtagsFailing = (sub) => Boolean(sub) && stateOf(sub).failHashtags;

/** Resolves after this caller's /__kudo-delay-hashtags delay (at once when none is set): await it before answering the catalog read. */
export const holdHashtagCatalog = (sub) => (sub && stateOf(sub).hashtagDelayMs ? sleep(stateOf(sub).hashtagDelayMs) : undefined);

/**
 * Test-only control endpoints (GET, keyed by ?sub=): /__kudo-log, /__kudo-fail-rpc, /__kudo-delay?ms= (create_kudo),
 * /__kudo-delay-search?ms= (kudos_search_sunners), /__kudo-fail-hashtags?on=1|0 (hashtags catalog GET answers 500),
 * /__kudo-delay-hashtags?ms= (the hashtags catalog GET is held back by ms before it answers, failing or not),
 * /__kudo-refuse-once?code= (the next create_kudo that passes validation answers 400 / 22023 / <code>, e.g. invalid_hashtags).
 * Edit mode (edit-kudo-contract.ts): /__kudo-seed-own?anon=1&alias= (an own Kudo, returns its id, images and content),
 * /__kudo-fail-update?on=1|0 (update_kudo answers a generic 500), /__kudo-refuse-update-once?code= (the next update_kudo that
 * passes validation answers 400 / 22023 / <code>, e.g. not_found).
 */
export function kudoControl(pathname, params) {
  if (!pathname.startsWith("/__kudo-")) return undefined;
  const sub = params.get("sub") || "anonymous";
  const state = stateOf(sub);
  if (pathname === "/__kudo-fail-rpc") state.failRpc = true;
  else if (pathname === "/__kudo-delay") state.delayMs = Number(params.get("ms") || 0);
  else if (pathname === "/__kudo-delay-search") state.searchDelayMs = Number(params.get("ms") || 0);
  else if (pathname === "/__kudo-delay-hashtags") state.hashtagDelayMs = Number(params.get("ms") || 0);
  else if (pathname === "/__kudo-fail-hashtags") state.failHashtags = params.get("on") !== "0";
  else if (pathname === "/__kudo-refuse-once") state.refuseOnce = params.get("code");
  else if (pathname === "/__kudo-fail-update") state.failUpdate = params.get("on") !== "0";
  else if (pathname === "/__kudo-refuse-update-once") state.refuseUpdateOnce = params.get("code");
  else if (pathname === "/__kudo-seed-own") return seedOwnKudo(sub, { anonymous: params.get("anon") === "1", alias: params.get("alias") });
  else if (pathname === "/__kudo-log") {
    const own = [...objects].filter(([, o]) => o.owner === sub).map(([path]) => path);
    return { rpc: state.rpc, uploads: state.uploads, deletes: state.deletes, objects: own };
  }
  return { ok: true };
}

// ---- Storage: POST|PUT /storage/v1/object/kudo-images/<name>, DELETE (single or {prefixes}), public GET ----
async function readBuffer(req) {
  const parts = [];
  for await (const chunk of req) parts.push(chunk);
  return Buffer.concat(parts);
}

/** supabase-js sends a File/Blob as multipart (unnamed part with filename) and a Buffer as the raw body. */
function extractFile(buf, contentType) {
  const m = /multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!m) return { bytes: buf, mime: String(contentType || "").split(";")[0].trim() };
  const boundary = Buffer.from(`--${m[1] || m[2]}`);
  for (let pos = buf.indexOf(boundary); pos !== -1;) {
    const next = buf.indexOf(boundary, pos + boundary.length);
    if (next === -1) break;
    const part = buf.subarray(pos + boundary.length + 2, next - 2);
    const split = part.indexOf("\r\n\r\n");
    const head = part.subarray(0, split).toString("latin1");
    if (/filename=/i.test(head)) {
      const mime = /content-type:\s*([^\r\n;]+)/i.exec(head)?.[1]?.trim() ?? "";
      return { bytes: part.subarray(split + 4), mime };
    }
    pos = next;
  }
  return { bytes: Buffer.alloc(0), mime: "" };
}

export async function handleStorage(req, res, url, sub) {
  const reply = (status, body, headers = { "content-type": "application/json" }) => {
    res.writeHead(status, headers);
    res.end(Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  const denied = () => reply(403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
  const root = `/storage/v1/object/${BUCKET}`;
  const publicRoot = `/storage/v1/object/public/${BUCKET}/`;
  const path = decodeURIComponent(url.pathname.slice(root.length + 1));
  if (req.method === "GET" && url.pathname.startsWith(publicRoot)) {
    const o = objects.get(decodeURIComponent(url.pathname.slice(publicRoot.length)));
    return o ? reply(200, o.bytes, { "content-type": o.mime }) : reply(404, { statusCode: "404", error: "not_found", message: "Object not found" });
  }
  if (!sub) return denied();
  const state = stateOf(sub);
  if ((req.method === "POST" || req.method === "PUT") && url.pathname.startsWith(`${root}/`)) {
    const { bytes, mime } = extractFile(await readBuffer(req), req.headers["content-type"]);
    // INSERT policy: signed-in caller; the row's owner_id is the JWT sub (Storage sets it, the client cannot). The name is not
    // restricted here, as in the real policy: create_kudo is what refuses anything but a flat {uuid}.{ext} owned by the sender.
    if (!path) return denied();
    if (!MIMES.has(mime)) return reply(415, { statusCode: "415", error: "invalid_mime_type", message: `mime type ${mime} is not supported` });
    if (bytes.length > MAX_IMAGE_BYTES) return reply(413, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" });
    if (objects.has(path) && req.headers["x-upsert"] !== "true") return reply(409, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
    objects.set(path, { owner: sub, bytes, mime });
    state.uploads.push({ path, size: bytes.length, mime, magic: bytes.subarray(0, 4).toString("hex") });
    return reply(200, { Id: path, Key: `${BUCKET}/${path}` });
  }
  if (req.method === "DELETE") {
    const prefixes = url.pathname === root ? (JSON.parse((await readBuffer(req)).toString() || "{}").prefixes ?? []) : [path];
    const removed = prefixes.filter((p) => objects.get(p)?.owner === sub); // RLS: only the caller's own objects
    for (const p of removed) {
      objects.delete(p);
      state.deletes.push(p);
    }
    return reply(200, url.pathname === root ? removed.map((name) => ({ name, bucket_id: BUCKET, owner: sub })) : { message: "Successfully deleted" });
  }
  return reply(404, { statusCode: "404", error: "not_found", message: `fake-supabase: no storage route ${req.method} ${url.pathname}` });
}
