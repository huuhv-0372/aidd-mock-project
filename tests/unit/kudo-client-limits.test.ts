import { describe, expect, it } from "vitest";
import { KUDO_LIMITS } from "@/components/kudos-compose/write-kudo-types";
import { KUDO_IMAGE_MAX_BYTES, KUDO_IMAGE_MAX_COUNT, KUDO_IMAGE_MIME_TYPES } from "@/lib/kudos/kudo-image-file";
import { KUDO_ALIAS_MAX, KUDO_CONTENT_MAX, KUDO_HASHTAGS_MAX, KUDO_TITLE_MAX } from "@/lib/validation/write-kudo";

// The modal mirrors the server limits (a client file must not import zod); a drift would let the form allow what
// the server refuses, which the user only sees as a generic "send failed".
describe("KUDO_LIMITS", () => {
  it("matches every server-side limit", () => {
    expect(KUDO_LIMITS).toMatchObject({
      titleMax: KUDO_TITLE_MAX,
      aliasMax: KUDO_ALIAS_MAX,
      contentMax: KUDO_CONTENT_MAX,
      hashtagsMax: KUDO_HASHTAGS_MAX,
      imagesMax: KUDO_IMAGE_MAX_COUNT,
      imageBytesMax: KUDO_IMAGE_MAX_BYTES,
    });
    expect([...KUDO_LIMITS.imageTypes].sort()).toEqual([...KUDO_IMAGE_MIME_TYPES].sort());
  });
});
