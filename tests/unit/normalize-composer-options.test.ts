import { describe, expect, it } from "vitest";
import { getInitialRecipient } from "@/components/kudos-compose/normalize-composer-options";

describe("getInitialRecipient", () => {
  it("returns the recipient of a valid options object", () => {
    expect(getInitialRecipient({ recipient: { id: "u1", name: "An", extra: 1 } })).toEqual({ id: "u1", name: "An" });
  });

  it.each([
    ["undefined", undefined],
    ["a click-event-like object", { type: "click", target: {} }],
    ["no recipient", {}],
    ["null recipient", { recipient: null }],
    ["non-string id", { recipient: { id: 1, name: "An" } }],
    ["missing name", { recipient: { id: "u1" } }],
    ["a string", "u1"],
  ])("returns null for %s", (_label, input) => {
    expect(getInitialRecipient(input)).toBeNull();
  });
});
