import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { fill } from "@/components/profile/fill-template";
import { ProfilePageLayout } from "@/components/profile/profile-page-layout";
import { ProfileView } from "@/components/profile/profile-view";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";
import { PROFILE_PATH } from "@/lib/navigation/routes";
import { getProfilePageData } from "@/lib/profiles/get-profile-page-data";
import { loadMoreProfileKudos } from "@/lib/profiles/load-more-profile-kudos-action";

type PageProps = { params: Promise<{ locale: string; id: string }> };

/** "{name} | SAA 2025" once the profile loaded; otherwise the layout's default title (the 404 page brings its own). */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  const { id } = await params;
  await connection();
  const data = await getProfilePageData(id); // React cache(): the page below reuses this same pass
  if (data.status !== "ok") return {};
  return { title: fill(dict.profile.metaTitleOther, "name", data.person.full_name ?? dict.profile.unknownName) };
}

/*
 * Another Sunner's profile (Figma 362:5097). Signed-in only (proxy default-deny sends guests to login). connection() first:
 * the loader swallows the cookies() bailout in its try/catch. A malformed or unknown id (or a caller the RPC refuses) is a
 * 404 and the caller's own id redirects to /profile; both run before anything renders, so the status is real (404 / 307).
 */
export default async function OtherProfilePage({ params }: PageProps) {
  const { locale, dict } = await getRouteDictionary(params);
  const { id } = await params;
  await connection();
  const data = await getProfilePageData(id);
  if (data.status === "not_found") notFound();
  if (data.status === "redirect_self") redirect(PROFILE_PATH);
  if (data.status === "error") {
    return (
      <ProfilePageLayout locale={locale} shell={dict.shell}>
        <p role="alert">{dict.profile.loadError}</p>
      </ProfilePageLayout>
    );
  }
  return <ProfileView data={data} locale={locale} dict={dict} loadMore={loadMoreProfileKudos} />;
}
