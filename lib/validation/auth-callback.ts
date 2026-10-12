import { z } from "zod";

/** Only `code` and `error` are read; every other param (`next`, `redirect_to`, ...) is stripped. */
const authCallbackQuerySchema = z.object({
  code: z.string().min(1).max(512).optional(),
  error: z.string().optional(),
});

/**
 * Validates the OAuth callback query. Returns the code to exchange, or `null` when the
 * provider reported an error, the code is missing, or the input is malformed.
 */
export function parseAuthCallbackQuery(params: URLSearchParams): { code: string } | null {
  const parsed = authCallbackQuerySchema.safeParse({
    code: params.get("code") ?? undefined,
    error: params.get("error") ?? undefined,
  });
  if (!parsed.success) return null;
  const { code, error } = parsed.data;
  if (error !== undefined || code === undefined) return null;
  return { code };
}
