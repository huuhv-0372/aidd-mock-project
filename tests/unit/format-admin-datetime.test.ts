import { describe, expect, it } from "vitest";
import { adminFileDate, formatAdminDateTime } from "@/lib/admin/format-admin-datetime";

describe("formatAdminDateTime", () => {
  it("formats in Vietnam time (UTC+7) as dd/MM/yyyy and HH:mm", () => {
    expect(formatAdminDateTime("2026-10-05T02:30:00.000Z")).toEqual({ date: "05/10/2026", time: "09:30" });
    expect(formatAdminDateTime("2026-09-20T08:15:00+00:00")).toEqual({ date: "20/09/2026", time: "15:15" });
  });

  it("rolls over to the next day after 17:00 UTC and uses 00 for midnight", () => {
    expect(formatAdminDateTime("2026-12-31T17:00:00Z")).toEqual({ date: "01/01/2027", time: "00:00" });
  });

  it.each([null, "", "not a date", "2026-13-45T99:00:00Z"])("returns null for %j", (value) => {
    expect(formatAdminDateTime(value)).toBeNull();
  });
});

describe("adminFileDate", () => {
  it("is YYYYMMDD of the Vietnam calendar day", () => {
    expect(adminFileDate(new Date("2026-10-23T16:59:00Z"))).toBe("20261023");
    expect(adminFileDate(new Date("2026-10-23T17:00:00Z"))).toBe("20261024");
  });
});
