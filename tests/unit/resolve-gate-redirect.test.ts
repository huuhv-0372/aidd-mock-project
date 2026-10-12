import { describe, expect, it } from "vitest";
import { resolveGateRedirect } from "@/lib/countdown/resolve-gate-redirect";

describe("resolveGateRedirect", () => {
  describe("before launch", () => {
    it.each(["/", "/login", "/does-not-exist", "/countdown/x"])(
      "redirects %s to /countdown",
      (path) => {
        expect(resolveGateRedirect(path, false)).toBe("/countdown");
      },
    );

    it.each(["/countdown", "/countdown/"])("lets %s through", (path) => {
      expect(resolveGateRedirect(path, false)).toBeNull();
    });
  });

  describe("after launch", () => {
    it.each(["/countdown", "/countdown/"])("redirects %s to /login", (path) => {
      expect(resolveGateRedirect(path, true)).toBe("/login");
    });

    it.each(["/", "/login", "/does-not-exist"])("lets %s through", (path) => {
      expect(resolveGateRedirect(path, true)).toBeNull();
    });
  });
});
