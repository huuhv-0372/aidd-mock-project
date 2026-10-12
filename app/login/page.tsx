import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginBackground } from "@/components/login/login-background";
import { LoginErrorBanner } from "@/components/login/login-error-banner";
import { LoginFooter } from "@/components/login/login-footer";
import { GoogleLoginForm } from "@/components/login/google-login-form";
import { LoginHeader } from "@/components/login/login-header";
import { LoginHero } from "@/components/login/login-hero";
import { LOGIN_ERROR_MESSAGE, LOGIN_ERROR_PARAM } from "@/lib/auth/constants";

export const metadata: Metadata = {
  title: "Đăng nhập | SAA 2025",
};

/* Reads searchParams (runtime data), so it must sit inside <Suspense> under cacheComponents.
 * The param value is never reflected — only a fixed message is shown. */
async function LoginErrorFromQuery({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params[LOGIN_ERROR_PARAM] === undefined) return null;
  return <LoginErrorBanner message={LOGIN_ERROR_MESSAGE} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <LoginBackground />
      <LoginHeader />
      <LoginHero>
        <Suspense fallback={null}>
          <LoginErrorFromQuery searchParams={searchParams} />
        </Suspense>
        <GoogleLoginForm />
      </LoginHero>
      <LoginFooter />
    </div>
  );
}
