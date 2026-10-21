import { afterEach, describe, expect, it, vi } from "vitest";
import {
  POST_LOGIN_NEXT_COOKIE,
  POST_LOGIN_NEXT_MAX_AGE,
  POST_LOGIN_NEXT_PARAM,
  parsePostLoginNext,
  postLoginNextCookieOptions,
} from "@/lib/auth/post-login-next";

const ID = "c1000000-0000-0000-0000-000000000003"; // seed-style id: no v4 version/variant bits
const PATH = `/sun-kudos/${ID}`;

describe("parsePostLoginNext", () => {
  it.each([
    PATH,
    "/sun-kudos/6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11",
    "/sun-kudos/00000000-0000-0000-0000-000000000000",
  ])("accepts the Kudo detail path %s unchanged", (value) => {
    expect(parsePostLoginNext(value)).toBe(value);
  });

  it("returns the lower-case canonical path for an upper-case id", () => {
    expect(parsePostLoginNext("/sun-kudos/6F1C1C3E-3B0F-4A53-9A55-2F3D2A1F9B11")).toBe(
      "/sun-kudos/6f1c1c3e-3b0f-4a53-9a55-2f3d2a1f9b11",
    );
  });

  // Allow-list: anything that is not exactly /sun-kudos/<guid> is refused, never "cleaned up".
  it.each([
    // off-site / protocol-relative / scheme tricks
    "https://evil.example",
    "http://evil.example/sun-kudos/" + ID,
    "//evil.example",
    "//evil.example/sun-kudos/" + ID,
    "/\\evil.example",
    "\\\\evil.example",
    "/\\/evil.example" + PATH,
    "javascript:alert(1)",
    "data:text/html,x",
    `https://localhost${PATH}`,
    // encoded tricks
    "%2F%2Fevil.example",
    "/%2F/evil.example",
    `%2Fsun-kudos%2F${ID}`,
    `/sun-kudos%2F${ID}`,
    `/sun-kudos/${ID}%2F`,
    `/sun-kudos/%2e%2e/${ID}`,
    // traversal / other paths
    "/sun-kudos/../x",
    `/sun-kudos/../sun-kudos/${ID}`,
    `/sun-kudos/./${ID}`,
    "/sun-kudos",
    "/sun-kudos/",
    "/",
    "/login",
    "/auth/callback",
    `/profile/${ID}`,
    `/en/sun-kudos/${ID}`,
    `/sun-kudosx/${ID}`,
    `/SUN-KUDOS/${ID}`,
    `sun-kudos/${ID}`,
    // query, hash, trailing slash, extra segments
    `${PATH}?x=1`,
    `${PATH}#top`,
    `${PATH}/`,
    `${PATH}//`,
    `${PATH}/x`,
    `${PATH}//evil.example`,
    // whitespace and control characters
    ` ${PATH}`,
    `${PATH} `,
    `${PATH}\n`,
    `${PATH}\r\n`,
    `\t${PATH}`,
    `${PATH}\u0000`,
    `/sun-kudos/${ID.slice(0, 8)}\u0000${ID.slice(8)}`,
    // malformed ids
    "/sun-kudos/not-a-uuid",
    `/sun-kudos/${ID.replace(/-/g, "")}`,
    `/sun-kudos/{${ID}}`,
    `/sun-kudos/${ID}0`,
    `/sun-kudos/${ID.slice(1)}`,
    "/sun-kudos/g1000000-0000-0000-0000-000000000003",
    `/sun-kudos/${"a".repeat(2000)}`,
    `${PATH}${"0".repeat(5000)}`,
    "",
  ])("rejects %j", (value) => {
    expect(parsePostLoginNext(value)).toBeNull();
  });

  it.each([null, undefined, 42, true, {}, [PATH], { toString: () => PATH }, new String(PATH)])(
    "rejects the non-string %j",
    (value) => {
      expect(parsePostLoginNext(value)).toBeNull();
    },
  );
});

describe("post-login next cookie", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the next query param and a dedicated cookie that lives 10 minutes", () => {
    expect(POST_LOGIN_NEXT_PARAM).toBe("next");
    expect(POST_LOGIN_NEXT_COOKIE).toMatch(/^[a-z_]+$/);
    expect(POST_LOGIN_NEXT_MAX_AGE).toBe(600);
  });

  it("is httpOnly, SameSite=Lax, site-wide, and not Secure outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(postLoginNextCookieOptions(600)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 600,
    });
  });

  it("is Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(postLoginNextCookieOptions(0)).toMatchObject({ secure: true, maxAge: 0, path: "/" });
  });
});
