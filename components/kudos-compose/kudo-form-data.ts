import type { AttachedImage } from "./use-image-attachments";

type Common = { title: string; content: string; hashtagSlugs: string[]; alias: string; images: AttachedImage[] };

function fillCommon(data: FormData, { title, content, hashtagSlugs }: Common) {
  data.set("title", title.trim());
  data.set("content", content);
  for (const slug of hashtagSlugs) data.append("hashtags", slug);
}

/** FormData of createKudo: recipientId, title, content (Markdown), hashtags, isAnonymous, anonymousName (anonymous + not blank), images. */
export function buildCreateKudoData(input: Common & { recipientId: string; anonymous: boolean }): FormData {
  const data = new FormData();
  data.set("recipientId", input.recipientId);
  fillCommon(data, input);
  data.set("isAnonymous", String(input.anonymous));
  if (input.anonymous && input.alias.trim()) data.set("anonymousName", input.alias.trim());
  for (const image of input.images) if (image.file) data.append("images", image.file);
  return data;
}

/**
 * FormData of updateKudo: kudoId, title, content, hashtags, anonymousName (anonymous Kudo + not blank), keepImages (stored URLs
 * still on the list, in order), images (new files, in add order). The recipient and the anonymous state never travel: they cannot change.
 */
export function buildUpdateKudoData(input: Common & { kudoId: string; anonymous: boolean }): FormData {
  const data = new FormData();
  data.set("kudoId", input.kudoId);
  fillCommon(data, input);
  if (input.anonymous && input.alias.trim()) data.set("anonymousName", input.alias.trim());
  for (const image of input.images) {
    if (image.file) data.append("images", image.file);
    else data.append("keepImages", image.url);
  }
  return data;
}
