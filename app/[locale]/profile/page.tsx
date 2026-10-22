import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProfilePageLayout } from "@/components/profile/profile-page-layout";
import { ProfileView } from "@/components/profile/profile-view";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";
import { getProfilePageData } from "@/lib/profiles/get-profile-page-data";
import { loadMoreProfileKudos } from "@/lib/profiles/load-more-profile-kudos-action";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  return { title: dict.profile.metaTitleSelf };
}

/*
 * My profile (Figma 362:5037). Signed-in only (proxy default-deny sends guests to login). connection() first: the loader
 * swallows the cookies() bailout in its try/catch, so without it this route would be prerendered per locale at build time
 * with a fake auth failure baked in. A caller with no profile card is a 404 (notFound() before anything renders); a failed
 * read shows a generic error in the page frame.
 */
export default async function MyProfilePage({ params }: PageProps) {
  const { locale, dict } = await getRouteDictionary(params);
  await connection();
  const data = await getProfilePageData(null);
  if (data.status === "not_found" || data.status === "redirect_self") notFound();
  if (data.status === "error") {
    return (
      <ProfilePageLayout locale={locale} shell={dict.shell}>
        <p role="alert">{dict.profile.loadError}</p>
      </ProfilePageLayout>
    );
  }
  return <ProfileView data={data} locale={locale} dict={dict} loadMore={loadMoreProfileKudos} />;
}
