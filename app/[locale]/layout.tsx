import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { LocaleChangeReload } from "@/components/ui/locale-change-reload";
import { LOCALES, isLocale } from "@/lib/i18n/locales";
import "../globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  variable: "--next-font-montserrat",
});

const digitalNumbers = localFont({
  src: "../fonts/digital-numbers-regular.ttf",
  variable: "--next-font-digital-numbers",
  weight: "400",
});

export const metadata: Metadata = {
  title: "SAA 2025",
  description: "SAA 2025",
};

/** Both locales are prerendered; proxy.ts picks one per request from the NEXT_LOCALE cookie. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      className={`${montserrat.variable} ${digitalNumbers.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleChangeReload locale={locale} />
        {children}
      </body>
    </html>
  );
}
