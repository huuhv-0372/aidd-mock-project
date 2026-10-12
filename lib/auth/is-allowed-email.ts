import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/constants";

/**
 * True only when the part after the LAST '@' equals the allowed domain exactly (case-insensitive)
 * and the local part is non-empty. Exact match, not suffix: `evil-sun-asterisk.com`,
 * `sun-asterisk.com.evil.io` and subdomains are rejected. Mirrors the DB gate in the profiles migration.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  return at > 0 && normalized.slice(at + 1) === ALLOWED_EMAIL_DOMAIN;
}
