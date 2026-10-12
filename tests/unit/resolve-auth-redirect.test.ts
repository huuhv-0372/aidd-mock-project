import { describe, expect, it } from "vitest";
import { resolveAuthRedirect } from "@/lib/auth/resolve-auth-redirect";

describe("resolveAuthRedirect", () => {
  it.each(["/login", "/login/", "/login//"])("sends an authenticated user on %s to /", (path) => {
    expect(resolveAuthRedirect(path, true)).toBe("/");
  });

  it.each(["/login", "/login/"])("lets an anonymous user stay on %s", (path) => {
    expect(resolveAuthRedirect(path, false)).toBeNull();
  });

  it.each(["/", "/auth/callback", "/login/x", "/loginx", "/countdown"])(
    "never redirects %s",
    (path) => {
      expect(resolveAuthRedirect(path, true)).toBeNull();
      expect(resolveAuthRedirect(path, false)).toBeNull();
    },
  );
});
