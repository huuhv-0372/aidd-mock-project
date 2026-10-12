import { z } from "zod";

const originSchema = z.url({ protocol: /^https?$/ });

/** Returns the Origin header value when it is a valid http(s) URL, otherwise null. */
export function parseRequestOrigin(value: string | null): string | null {
  const parsed = originSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
