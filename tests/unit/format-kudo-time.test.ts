import { describe, expect, it } from "vitest";
import { formatKudoTime } from "@/lib/kudos/format-kudo-time";

describe("formatKudoTime", () => {
  it("formats as HH:mm - MM/DD/YYYY in Vietnam time", () => {
    expect(formatKudoTime("2026-10-14T03:05:00Z")).toBe("10:05 - 10/14/2026");
  });

  it("rolls a late-UTC instant into the next Vietnamese day (UTC+7)", () => {
    expect(formatKudoTime("2026-10-14T17:30:00Z")).toBe("00:30 - 10/15/2026");
    expect(formatKudoTime("2026-12-31T17:00:00Z")).toBe("00:00 - 01/01/2027");
  });

  it("keeps the previous day just before the Vietnamese midnight", () => {
    expect(formatKudoTime("2026-10-14T16:59:00Z")).toBe("23:59 - 10/14/2026");
  });

  it("reads an explicit offset the same way as the equivalent UTC instant", () => {
    expect(formatKudoTime("2026-10-14T10:00:00+07:00")).toBe("10:00 - 10/14/2026");
    expect(formatKudoTime("2026-10-14T03:00:00.123456+00:00")).toBe("10:00 - 10/14/2026");
  });

  it("returns an empty string for unparseable input instead of throwing", () => {
    expect(formatKudoTime("not a date")).toBe("");
    expect(formatKudoTime("")).toBe("");
  });
});
