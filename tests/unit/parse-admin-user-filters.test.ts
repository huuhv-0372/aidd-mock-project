import { describe, expect, it } from "vitest";
import { ADMIN_SEARCH_MAX_LENGTH } from "@/lib/admin/admin-user-types";
import { ADMIN_DEFAULT_FILTERS } from "@/lib/admin/admin-users-href";
import { parseAdminUserFilters } from "@/lib/admin/parse-admin-user-filters";

describe("parseAdminUserFilters", () => {
  it("returns the defaults for an empty query", () => {
    expect(parseAdminUserFilters({})).toEqual({
      unit: null,
      level: null,
      role: null,
      q: "",
      sort: null,
      dir: "desc",
      page: 1,
    });
    expect(parseAdminUserFilters({})).toEqual(ADMIN_DEFAULT_FILTERS);
  });

  it("reads every valid value", () => {
    expect(
      parseAdminUserFilters({
        unit: "STVC - R&D",
        level: "0",
        role: "admin",
        q: "  phuong.anh  ",
        sort: "last_login",
        dir: "asc",
        page: "3",
      }),
    ).toEqual({ unit: "STVC - R&D", level: 0, role: "admin", q: "phuong.anh", sort: "last_login", dir: "asc", page: 3 });
  });

  it("takes the first value of a repeated parameter", () => {
    expect(parseAdminUserFilters({ role: ["user", "admin"], page: ["2", "9"] })).toMatchObject({ role: "user", page: 2 });
  });

  it("drops each invalid value on its own and keeps the valid ones (the page still answers 200)", () => {
    expect(parseAdminUserFilters({ level: "9", dir: "x", sort: "bogus", page: "-1", role: "admin" })).toEqual({
      ...ADMIN_DEFAULT_FILTERS,
      role: "admin",
    });
  });

  it.each([
    ["level 5", { level: "5" }, "level", null],
    ["level -1", { level: "-1" }, "level", null],
    ["level 1.0", { level: "1.0" }, "level", null],
    ["empty level", { level: "" }, "level", null],
    ["unknown role", { role: "root" }, "role", null],
    ["role in upper case", { role: "Admin" }, "role", null],
    ["sort in upper case", { sort: "SENT" }, "sort", null],
    ["empty unit", { unit: "" }, "unit", null],
    ["unit over 64 characters", { unit: "x".repeat(65) }, "unit", null],
    ["dir in upper case", { dir: "ASC" }, "dir", "desc"],
    ["page 0", { page: "0" }, "page", 1],
    ["page 2.5", { page: "2.5" }, "page", 1],
    ["page 1e3", { page: "1e3" }, "page", 1],
    ["page abc", { page: "abc" }, "page", 1],
    ["empty page", { page: "" }, "page", 1],
  ])("falls back to the default for %s", (_name, raw, key, expected) => {
    expect(parseAdminUserFilters(raw)[key as keyof typeof ADMIN_DEFAULT_FILTERS]).toBe(expected);
  });

  it("keeps a unit of exactly 64 characters", () => {
    expect(parseAdminUserFilters({ unit: "x".repeat(64) }).unit).toBe("x".repeat(64));
  });

  it("clamps a huge page to 100000 instead of failing", () => {
    expect(parseAdminUserFilters({ page: "250000" }).page).toBe(100000);
    expect(parseAdminUserFilters({ page: "9".repeat(400) }).page).toBe(100000);
  });

  it("trims the search and cuts it to the limit, with no trailing space left by the cut", () => {
    const long = "a".repeat(ADMIN_SEARCH_MAX_LENGTH + 50);
    expect(parseAdminUserFilters({ q: long }).q).toBe("a".repeat(ADMIN_SEARCH_MAX_LENGTH));
    const cutAtSpace = `${"b".repeat(ADMIN_SEARCH_MAX_LENGTH - 1)} c`;
    expect(parseAdminUserFilters({ q: cutAtSpace }).q).toBe("b".repeat(ADMIN_SEARCH_MAX_LENGTH - 1));
    expect(parseAdminUserFilters({ q: " \t\n " }).q).toBe("");
  });

  it("keeps search characters as typed (escaping is the database's job)", () => {
    expect(parseAdminUserFilters({ q: "100%_\\" }).q).toBe("100%_\\");
  });
});
