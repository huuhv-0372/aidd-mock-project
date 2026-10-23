import type { KudoRow } from "@/lib/kudos/kudo-types";
import type { EditableKudo } from "./write-kudo-types";

/** What the edit modal pre-fills from a Kudo row the viewer sent. */
export function toEditableKudo(kudo: KudoRow): EditableKudo {
  return {
    id: kudo.id,
    recipient: { id: kudo.recipient.id, name: kudo.recipient.full_name ?? "" },
    title: kudo.title,
    content: kudo.content,
    hashtagSlugs: kudo.hashtags.map((tag) => tag.slug),
    images: kudo.images,
    isAnonymous: kudo.is_anonymous,
    anonymousName: kudo.anonymous_name,
  };
}
