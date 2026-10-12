import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  weight: ["700"],
  variable: "--next-font-montserrat",
});

const digitalNumbers = localFont({
  src: "./fonts/digital-numbers-regular.ttf",
  variable: "--next-font-digital-numbers",
  weight: "400",
});

export const metadata: Metadata = {
  title: "SAA 2025",
  description: "SAA 2025",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${montserrat.variable} ${digitalNumbers.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
