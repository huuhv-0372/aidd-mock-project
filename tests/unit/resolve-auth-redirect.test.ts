import { describe, expect, it } from "vitest";
import { resolveAuthRedirect } from "@/lib/auth/resolve-auth-redirect";

describe("resolveAuthRedirect", () => {
  // Default-deny: anonymous visitors only reach the exact public paths.
  it.each(["/x", "/awards-information", "/login/x", "/loginx", "/does-not-exist", "/tieu-chuan-chung/x", "/403/x"])(
    "sends an anonymous user on %s to /login",
    (path) => {
      expect(resolveAuthRedirect(path, false)).toBe("/login");
    },
  );

  // A path of only slashes (`//`, `///`) normalises to "/", the public homepage.
  it.each([
    "/",
    "//",
    "///",
    "/login",
    "/login/",
    "/auth/callback",
    "/countdown",
    "/countdown/",
    "/tieu-chuan-chung",
    "/tieu-chuan-chung/",
    "/403",
    "/403/",
  ])(
    "lets an anonymous user stay on public path %s",
    (path) => {
      expect(resolveAuthRedirect(path, false)).toBeNull();
    },
  );

  it.each(["/login", "/login/", "/login//"])("sends an authenticated user on %s to /", (path) => {
    expect(resolveAuthRedirect(path, true)).toBe("/");
  });

  it.each(["/", "//", "/awards-information", "/countdown", "/auth/callback"])(
    "never redirects an authenticated user on %s",
    (path) => {
      expect(resolveAuthRedirect(path, true)).toBeNull();
    },
  );
});

describe("resolveAuthRedirect: post-login next", () => {
  const ID = "c1000000-0000-0000-0000-000000000003";
  const KUDO = `/sun-kudos/${ID}`;
  const LOGIN_NEXT = `/login?next=${encodeURIComponent(KUDO)}`;

  it.each([KUDO, `${KUDO}/`, `${KUDO}//`])("sends an anonymous user on %s to /login with next", (path) => {
    const target = resolveAuthRedirect(path, false);
    expect(target).toBe(LOGIN_NEXT);
    expect(new URL(target ?? "", "http://localhost").searchParams.get("next")).toBe(KUDO);
  });

  // Only the allow-listed path itself becomes next; every other protected path gets a bare /login.
  it.each(["/sun-kudos", "/sun-kudos/not-a-uuid", `/sun-kudos/${ID}/x`, `/profile/${ID}`, "//evil.example"])(
    "sends an anonymous user on %s to a bare /login",
    (path) => {
      expect(resolveAuthRedirect(path, false)).toBe("/login");
    },
  );

  it("ignores a next param for an anonymous user (the login page is public)", () => {
    expect(resolveAuthRedirect("/login", false, KUDO)).toBeNull();
  });

  it.each(["/login", "/login/"])("sends an authenticated user on %s with a valid next there", (path) => {
    expect(resolveAuthRedirect(path, true, KUDO)).toBe(KUDO);
  });

  it.each([
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\evil.example",
    "%2F%2Fevil.example",
    `${KUDO}?x=1`,
    `${KUDO}/`,
    `https://evil.example${KUDO}`,
    "/sun-kudos/../x",
    "/",
  ])("sends an authenticated user on /login with next=%j to /", (next) => {
    expect(resolveAuthRedirect("/login", true, next)).toBe("/");
  });

  it("never redirects an authenticated user on a non-login path because of next", () => {
    expect(resolveAuthRedirect("/awards-information", true, KUDO)).toBeNull();
  });
});
