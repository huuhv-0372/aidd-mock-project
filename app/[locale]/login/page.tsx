import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginBackground } from "@/components/login/login-background";
import { LoginErrorBanner } from "@/components/login/login-error-banner";
import { LoginFooter } from "@/components/login/login-footer";
import { GoogleLoginForm } from "@/components/login/google-login-form";
import { LoginHeader } from "@/components/login/login-header";
import { LoginHero } from "@/components/login/login-hero";
import { LOGIN_ERROR_PARAM } from "@/lib/auth/constants";
import { POST_LOGIN_NEXT_PARAM, parsePostLoginNext } from "@/lib/auth/post-login-next";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PageProps = { params: Promise<{ locale: string }>; searchParams: SearchParams };

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  return { title: dict.login.metaTitle };
}

/* Reads searchParams (runtime data), so it must sit inside <Suspense> under cacheComponents.
 * The param value is never reflected - only a fixed, localised message is shown. */
async function LoginErrorFromQuery({ searchParams, message }: { searchParams: SearchParams; message: string }) {
  const params = await searchParams;
  if (params[LOGIN_ERROR_PARAM] === undefined) return null;
  return <LoginErrorBanner message={message} />;
}

/* Same Suspense rule. `next` reaches the form only after the allow-list (a hidden field, never
 * text); anything else - an off-site URL, an array - just renders the plain form. */
async function GoogleLoginFormFromQuery({ searchParams, label }: { searchParams: SearchParams; label: string }) {
  const params = await searchParams;
  return <GoogleLoginForm label={label} next={parsePostLoginNext(params[POST_LOGIN_NEXT_PARAM])} />;
}

export default async function LoginPage({ params, searchParams }: PageProps) {
  const { locale, dict } = await getRouteDictionary(params);
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <LoginBackground />
      <LoginHeader locale={locale} copy={dict.shell} />
      <LoginHero copy={dict.login}>
        <Suspense fallback={null}>
          <LoginErrorFromQuery searchParams={searchParams} message={dict.login.errorMessage} />
        </Suspense>
        <Suspense fallback={<GoogleLoginForm label={dict.login.googleButton} next={null} />}>
          <GoogleLoginFormFromQuery searchParams={searchParams} label={dict.login.googleButton} />
        </Suspense>
      </LoginHero>
      <LoginFooter copyright={dict.shell.footer.copyright} />
    </div>
  );
}
