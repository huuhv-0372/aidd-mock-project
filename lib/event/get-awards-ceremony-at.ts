import { parseIsoWithOffset } from "./parse-iso-with-offset";

/** AWARDS_CEREMONY_AT as epoch ms, or null when missing/invalid (countdown shows 00). */
export function getAwardsCeremonyAt(
  raw: string | undefined = process.env.AWARDS_CEREMONY_AT,
): number | null {
  const ms = parseIsoWithOffset(raw);
  if (ms === null) console.error("[home-countdown] AWARDS_CEREMONY_AT missing or invalid");
  return ms;
}
