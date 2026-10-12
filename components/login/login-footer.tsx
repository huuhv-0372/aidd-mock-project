import { Montserrat_Alternates } from "next/font/google";

const montserratAlternates = Montserrat_Alternates({
  subsets: ["latin", "vietnamese"],
  weight: ["700"],
});

export function LoginFooter() {
  return (
    // mm:662:14447
    <footer className="w-full border-t border-login-divider">
      <div className="mx-auto flex h-[91px] w-full max-w-[1440px] items-center justify-center px-4 md:px-12 lg:px-[90px]">
        {/* mm:I662:14447;342:1413 */}
        <p
          className={`${montserratAlternates.className} text-center text-base leading-6 font-bold text-white`}
        >
          Bản quyền thuộc về Sun* © 2025
        </p>
      </div>
    </footer>
  );
}
