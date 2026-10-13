import { describe, expect, it } from "vitest";
import { resolveAuthRedirect } from "@/lib/auth/resolve-auth-redirect";

describe("resolveAuthRedirect", () => {
  // Default-deny: anonymous visitors only reach the exact public paths.
  it.each(["/x", "/awards-information", "/login/x", "/loginx", "/does-not-exist"])(
    "sends an anonymous user on %s to /login",
    (path) => {
      expect(resolveAuthRedirect(path, false)).toBe("/login");
    },
  );

  // `//` normalises to "" (not "/"), so it is not the public homepage and stays denied.
  it("keeps // denied for an anonymous user", () => {
    expect(resolveAuthRedirect("//", false)).toBe("/login");
  });

  it.each(["/", "/login", "/login/", "/auth/callback", "/countdown", "/countdown/"])(
    "lets an anonymous user stay on public path %s",
    (path) => {
      expect(resolveAuthRedirect(path, false)).toBeNull();
    },
  );

  it.each(["/login", "/login/", "/login//"])("sends an authenticated user on %s to /", (path) => {
    expect(resolveAuthRedirect(path, true)).toBe("/");
  });

  it.each(["/", "/awards-information", "/countdown", "/auth/callback"])(
    "never redirects an authenticated user on %s",
    (path) => {
      expect(resolveAuthRedirect(path, true)).toBeNull();
    },
  );
});
