import { describe, expect, it } from "vitest";
import { adminUserRowSchema, setUserRoleInputSchema } from "@/lib/validation/admin-users";
import { rpcRow } from "./support/admin-user-rpc-row";

// Fixture-style id (not RFC 4122 v4): Postgres accepts any 8-4-4-4-12 hex, and so must the schemas.
const ID = rpcRow.user_id;

describe("adminUserRowSchema", () => {
  it("accepts an RPC row, including null name/email/department/dates and a non-v4 id", () => {
    expect(adminUserRowSchema.safeParse(rpcRow).success).toBe(true);
    expect(adminUserRowSchema.safeParse({ ...rpcRow, full_name: null, email: null }).success).toBe(true);
  });

  it.each([
    ["level 5", { level: 5 }],
    ["level -1", { level: -1 }],
    ["level as text", { level: "4" }],
    ["unknown role", { role: "root" }],
    ["negative count", { sent: -1 }],
    ["fractional count", { hearts: 1.5 }],
    ["row_no 0", { row_no: 0 }],
    ["non-uuid id", { user_id: "user-1" }],
    ["empty timestamp", { last_sign_in_at: "" }],
    ["missing total", { total_count: undefined }],
  ])("rejects %s", (_name, patch) => {
    expect(adminUserRowSchema.safeParse({ ...rpcRow, ...patch }).success).toBe(false);
  });
});

describe("setUserRoleInputSchema", () => {
  it.each(["user", "admin"])("accepts role %s with a non-v4 id", (role) => {
    expect(setUserRoleInputSchema.safeParse({ userId: ID, role }).success).toBe(true);
  });

  it.each([
    ["unknown role", { userId: ID, role: "root" }],
    ["role in upper case", { userId: ID, role: "Admin" }],
    ["non-guid id", { userId: "1", role: "user" }],
    ["missing id", { role: "user" }],
    ["missing role", { userId: ID }],
    ["extra field", { userId: ID, role: "admin", self: true }],
    ["null", null],
    ["string", "admin"],
  ])("rejects %s", (_name, input) => {
    expect(setUserRoleInputSchema.safeParse(input).success).toBe(false);
  });
});
