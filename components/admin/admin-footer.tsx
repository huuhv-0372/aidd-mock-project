import { Montserrat_Alternates } from "next/font/google";

const montserratAlternates = Montserrat_Alternates({ subsets: ["latin", "vietnamese"], weight: ["500"] });

/* One centred line, 48px tall, Medium (the png is lighter than Bold), dark ink on the page grey (Figma 773:26441 "7_Footer"). Outside <main> so it keeps the contentinfo landmark. */
export function AdminFooter({ copyright }: { copyright: string }) {
  return (
    // mm:773:26441
    <footer data-testid="admin-footer" className="flex min-h-12 w-full items-center justify-center px-4">
      <p className={`${montserratAlternates.className} text-center text-base leading-6 font-medium text-login-bg`}>{copyright}</p>
    </footer>
  );
}
