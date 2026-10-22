import type { RecipientChoice } from "./write-kudo-types";

export type ComposerOptions = { recipient?: RecipientChoice };

/**
 * The recipient to pre-fill, or null. `openComposer` is also wired straight to click handlers, so anything that is not
 * an options object with a string `id` and `name` (a click event, undefined) means "open empty".
 */
export function getInitialRecipient(options: unknown): RecipientChoice | null {
  if (typeof options !== "object" || options === null) return null;
  const recipient = (options as { recipient?: unknown }).recipient;
  if (typeof recipient !== "object" || recipient === null) return null;
  const { id, name } = recipient as { id?: unknown; name?: unknown };
  return typeof id === "string" && typeof name === "string" ? { id, name } : null;
}
