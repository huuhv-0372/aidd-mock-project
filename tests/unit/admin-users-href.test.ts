import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AdminUserFilters } from "@/lib/admin/admin-user-types";
import { ADMIN_DEFAULT_FILTERS, adminExportHref, adminUsersHref } from "@/lib/admin/admin-users-href";
import { parseAdminUserFilters } from "@/lib/admin/parse-admin-user-filters";

/** Reads an href back the way the page does (URLSearchParams -> searchParams record -> parse). */
function parseHref(href: string): AdminUserFilters {
  const params = new URL(href, "http://x").searchParams;
  const raw: Record<string, string[]> = {};
  for (const key of new Set(params.keys())) raw[key] = params.getAll(key);
  return parseAdminUserFilters(raw);
}

const FULL: AdminUserFilters = {
  unit: "STVC - R&D",
  level: 0,
  role: "user",
  q: "a&b #c %d_",
  sort: "time6",
  dir: "asc",
  page: 4,
};

describe("adminUsersHref", () => {
  it("is the bare path when every value is the default", () => {
    expect(adminUsersHref({})).toBe("/admin/users");
    expect(adminUsersHref(ADMIN_DEFAULT_FILTERS)).toBe("/admin/users");
    expect(adminUsersHref({ q: "   ", page: 1, dir: "asc" })).toBe("/admin/users");
  });

  it("writes the parameters in a fixed order, sort always followed by dir", () => {
    expect(adminUsersHref(FULL)).toBe("/admin/users?unit=STVC+-+R%26D&level=0&role=user&q=a%26b+%23c+%25d_&sort=time6&dir=asc&page=4");
    expect(adminUsersHref({ sort: "sent", dir: "desc" })).toBe("/admin/users?sort=sent&dir=desc");
    expect(adminUsersHref({ sort: "sent" })).toBe("/admin/users?sort=sent&dir=desc");
  });

  it("keeps level 0 (a real filter, not the default)", () => {
    expect(adminUsersHref({ level: 0 })).toBe("/admin/users?level=0");
  });

  it("round-trips through parseAdminUserFilters, including & # % in unit and q", () => {
    expect(parseHref(adminUsersHref(FULL))).toEqual(FULL);
    const partial = { unit: "CEVC1 - DSV - UI/UX 1", q: "100%" };
    expect(parseHref(adminUsersHref(partial))).toEqual({ ...ADMIN_DEFAULT_FILTERS, ...partial });
  });

  it("trims and cuts the search like the parser does", () => {
    expect(adminUsersHref({ q: "  anh  " })).toBe("/admin/users?q=anh");
    expect(parseHref(adminUsersHref({ q: "z".repeat(150) })).q).toBe("z".repeat(100));
  });

  it("drops the direction when there is no sort key", () => {
    expect(adminUsersHref({ dir: "asc", role: "admin" })).toBe("/admin/users?role=admin");
  });
});

describe("adminExportHref", () => {
  it("points at the export route, always with a query string, never with page", () => {
    expect(adminExportHref(ADMIN_DEFAULT_FILTERS)).toBe("/admin/users/export?");
    expect(adminExportHref(FULL)).toBe("/admin/users/export?unit=STVC+-+R%26D&level=0&role=user&q=a%26b+%23c+%25d_&sort=time6&dir=asc");
  });

  it("carries the same filters the page reads back", () => {
    expect(parseHref(adminExportHref(FULL))).toEqual({ ...FULL, page: 1 });
  });
});

describe("admin-users-href module", () => {
  it("stays client-safe: no zod, no server-only import", () => {
    const source = readFileSync("lib/admin/admin-users-href.ts", "utf8");
    const imports = source.match(/from\s+["'][^"']+["']/g) ?? [];
    expect(imports.every((line) => /@\/lib\/(admin\/admin-user-types|navigation\/routes)/.test(line))).toBe(true);
  });
});
