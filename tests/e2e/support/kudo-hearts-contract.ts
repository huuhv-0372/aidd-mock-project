import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { KUDOS_FAKE, KUDO_HEART } from "./kudos-contract";

// Like Kudos (#13) selector + fake-control contract for kudo-hearts.spec.ts and sun-kudos-feed.spec.ts.
// The heart is ONE <button type="button"> per card: data-testid "kudo-hearts", aria-pressed (liked), data-liked,
// data-own, aria-label "{count} lượt thả tim". Own Kudo -> disabled. Fake side: kudo-hearts-fake.mjs.

export type HeartCall = { p_kudo_id: string; p_liked: boolean };
export type HeartFailure = "500" | "forbidden" | "not_found" | "own_kudo";

/** The heart inside the card of this Kudo, in the scope given (SEL.allKudos or SEL.highlight). */
export const heartIn = (page: Page, scope: string, kudoId: string): Locator =>
  page.getByTestId(scope).locator(`[data-testid="kudo-card"][data-kudo-id="${kudoId}"]`).getByTestId("kudo-hearts");

/** Accessible name of the heart: the count and the label, e.g. "15 lượt thả tim". */
export const heartLabel = (count: number) => `${count} lượt thả tim`;

/** Toast shown after a rollback (role status, same toast host as Copy Link). */
export const heartErrorToast = (page: Page) => page.getByRole("status").filter({ hasText: KUDO_HEART.errorToast });

/** Every set_kudo_heart call this caller made, in order (logged by the fake on arrival). */
export async function heartCalls(request: APIRequestContext, sub: string): Promise<HeartCall[]> {
  const res = await request.get(`${KUDOS_FAKE}/__kudo-heart-log?sub=${sub}`);
  return (await res.json()).calls;
}

/** Holds back every set_kudo_heart answer of this caller by ms (0 = none). The request is logged on arrival. */
export const delayHeartCalls = (request: APIRequestContext, sub: string, ms: number) =>
  request.get(`${KUDOS_FAKE}/__kudo-heart-delay?sub=${sub}&ms=${ms}`);

/** The next valid set_kudo_heart of this caller fails once: "500" = server error, else a 22023 with that message. */
export const failNextHeartCall = (request: APIRequestContext, sub: string, code: HeartFailure) =>
  request.get(`${KUDOS_FAKE}/__kudo-heart-fail?sub=${sub}&code=${code}`);
