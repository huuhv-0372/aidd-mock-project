import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KudoDetailCard } from "@/components/kudos/kudo-detail-card";
import { KudoDetailLayout } from "@/components/kudos/kudo-detail-layout";
import { KudoHeartsProvider } from "@/components/kudos/kudo-hearts-store";
import { KudoRichContent } from "@/components/kudos/kudo-rich-content";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";
import { getKudoDetail } from "@/lib/kudos/get-kudo-detail";
import { setKudoHeart } from "@/lib/kudos/set-kudo-heart-action";

type PageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  return { title: dict.kudos.detail.metaTitle };
}

/*
 * View Kudo (Figma 520:18779): one Kudo in full. Signed-in only (proxy default-deny sends guests to login).
 * A malformed or unknown id (or a caller `kudo_detail` refuses) is a 404: notFound() runs before anything renders,
 * with no Suspense above it, so the response status is really 404. A failed read shows a generic error in the frame.
 */
export default async function KudoDetailPage({ params }: PageProps) {
  const { locale, dict } = await getRouteDictionary(params);
  const { id } = await params;
  // No client here: getKudoDetail creates it inside its error handling, after the id check (a broken env is then a
  // 404 for a malformed id and the generic in-frame error otherwise, never a 500).
  const result = await getKudoDetail(id);
  if (result.status === "not_found") notFound();
  const copy = dict.kudos.detail;
  return (
    <KudoDetailLayout locale={locale} shell={dict.shell}>
      {result.status === "error" ? (
        <p role="alert">{copy.loadError}</p>
      ) : (
        <KudoHeartsProvider setHeart={setKudoHeart}>
          <KudoDetailCard
            kudo={result.kudo}
            locale={locale}
            copy={copy.card}
            content={<KudoRichContent markdown={result.kudo.content} />}
          />
        </KudoHeartsProvider>
      )}
    </KudoDetailLayout>
  );
}
