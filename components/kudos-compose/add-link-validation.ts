import type { AddLinkCopy } from "./write-kudo-copy";

export const LINK_RULES = { textMax: 100, urlMin: 5, urlMax: 2048 } as const;

export type AddLinkErrors = { text?: string; link?: string };

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Add link rules (OyDLDuSGEa spec + clarifications): Text 1-100 and not whitespace-only; Link http(s) only, 5-2048. */
export function validateAddLink(rawText: string, rawLink: string, copy: AddLinkCopy): { errors: AddLinkErrors; text: string; link: string } {
  const text = rawText.trim();
  const link = rawLink.trim();
  const errors: AddLinkErrors = {};
  if (!text) errors.text = copy.errors.required;
  else if (text.length > LINK_RULES.textMax) errors.text = copy.errors.textTooLong;
  if (!link) errors.link = copy.errors.required;
  else if (link.length < LINK_RULES.urlMin) errors.link = copy.errors.linkTooShort;
  else if (link.length > LINK_RULES.urlMax) errors.link = copy.errors.linkTooLong;
  else if (!isHttpUrl(link)) errors.link = copy.errors.linkInvalid;
  return { errors, text, link };
}
