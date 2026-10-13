// Test-only fake of the Supabase Auth endpoints the "authed" E2E server talks to.
// Bound to 127.0.0.1; only the authed app server's NEXT_PUBLIC_SUPABASE_URL points here.
// Prod code is untouched: the real proxy runs the real getClaims(), which verifies the ES256
// signature against this server's JWKS (a fresh keypair + random kid per start).
import { createServer } from "node:http";
import { generateKeyPairSync, sign, verify, randomUUID } from "node:crypto";

const PORT = Number(process.env.E2E_FAKE_SUPABASE_PORT || 54398);
const HOST = "127.0.0.1";
const COOKIE_NAME = `sb-${HOST.split(".")[0]}-auth-token`; // supabase-js storage key rule
const MAX_CHUNK_SIZE = 3180; // @supabase/ssr chunker: one cookie must hold the whole session
const KID = randomUUID();
const EMAIL = "e2e@sun-asterisk.com";

const realKey = generateKeyPairSync("ec", { namedCurve: "P-256" });
// Same kid, different key: proves verification is real (signature must fail, not be skipped).
const forgedKey = generateKeyPairSync("ec", { namedCurve: "P-256" });
const publicJwk = { ...realKey.publicKey.export({ format: "jwk" }), kid: KID, alg: "ES256", use: "sig" };

const loggedOutSessions = new Set();
const b64url = (input) => Buffer.from(input).toString("base64url");

function signJwt(payload, privateKey) {
  const head = b64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid: KID }));
  const body = b64url(JSON.stringify(payload));
  const sig = sign("sha256", Buffer.from(`${head}.${body}`), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${sig.toString("base64url")}`;
}

/** Returns the verified payload or null (bad signature, malformed, expired). */
function verifyJwt(token) {
  const [head, body, sig] = String(token || "").split(".");
  if (!head || !body || !sig) return null;
  const ok = verify("sha256", Buffer.from(`${head}.${body}`), {
    key: realKey.publicKey,
    dsaEncoding: "ieee-p1363",
  }, Buffer.from(sig, "base64url"));
  if (!ok) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
}

function buildUser(sub) {
  return {
    id: sub,
    aud: "authenticated",
    role: "authenticated",
    email: EMAIL,
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "E2E User" },
    created_at: "2025-01-01T00:00:00Z",
  };
}

function mint(forged) {
  const now = Math.floor(Date.now() / 1000);
  const sub = randomUUID();
  const sessionId = randomUUID();
  const claims = {
    sub, email: EMAIL, aud: "authenticated", role: "authenticated", session_id: sessionId,
    iss: `http://${HOST}:${PORT}/auth/v1`, iat: now, exp: now + 3600,
    app_metadata: { provider: "google", providers: ["google"] },
  };
  const session = {
    access_token: signJwt(claims, forged ? forgedKey.privateKey : realKey.privateKey),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: `e2e-refresh-${sessionId}`,
    user: buildUser(sub),
  };
  const value = `base64-${b64url(JSON.stringify(session))}`;
  if (value.length >= MAX_CHUNK_SIZE) throw new Error(`minted cookie too large: ${value.length}`);
  return { name: COOKIE_NAME, value, sessionId };
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

const bearer = (req) => (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const route = `${req.method} ${url.pathname}`;
  try {
    switch (route) {
      case "GET /health":
        return send(res, 200, { ok: true });
      case "GET /auth/v1/.well-known/jwks.json":
        return send(res, 200, { keys: [publicJwk] });
      case "GET /auth/v1/user": {
        const payload = verifyJwt(bearer(req));
        if (!payload) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
        return send(res, 200, buildUser(payload.sub));
      }
      case "POST /auth/v1/logout": {
        const payload = verifyJwt(bearer(req));
        if (payload) loggedOutSessions.add(payload.session_id);
        res.writeHead(204);
        return res.end();
      }
      case "GET /__mint":
        return send(res, 200, mint(url.searchParams.get("forged") === "1"));
      case "GET /__logout-seen":
        return send(res, 200, { seen: loggedOutSessions.has(url.searchParams.get("session")) });
      default:
        // Refresh or anything unexpected fails loudly instead of silently "authenticating".
        return send(res, 404, { code: 404, msg: `fake-supabase: no route ${route}` });
    }
  } catch (error) {
    console.error("[fake-supabase]", error);
    return send(res, 500, { code: 500, msg: "fake-supabase error" });
  }
}).listen(PORT, HOST, () => console.log(`[fake-supabase] listening on http://${HOST}:${PORT}`));
