import type { Dictionary } from "@/messages/vi";

const H2 =
  "text-[28px] leading-9 font-bold text-login-accent sm:text-4xl sm:leading-11 md:text-[45px] md:leading-[56px]";
const BODY = "text-base leading-6 font-bold tracking-[0.15px]";
/* Figma list rows sit on a 30px pitch (wrapped lines too), so list items carry the 30px line box. */
const LIST_ITEM = "text-base leading-[30px] font-bold tracking-[0.15px] text-white";

/*
 * Sections B (Tiêu chuẩn cộng đồng) and C (Tiêu chuẩn bảo mật) of Figma 1161:8944: block x=144 w=1152 with 16px
 * padding (text x=160, w=1120), sections 32px apart around a 1px divider. The Figma footer starts 72px under the
 * last line while SiteFooter keeps its 125px top margin from xl, hence the -53px bottom margin there. The intro
 * text box is 1092px wide (Figma), `relative` lifts the block above the hero band that overhangs it.
 */
export function StandardsContent({ copy }: { copy: Dictionary["standards"] }) {
  const { community, security } = copy;
  return (
    // mm:1161:8944 content block
    <div className="relative mx-auto w-full max-w-[1512px] px-0 font-montserrat md:px-8 xl:-mb-[53px] xl:px-36">
      <div className="flex flex-col gap-8 p-4 xl:pb-0">
        <h1 className="sr-only">{copy.pageTitle}</h1>
        <section aria-labelledby="standards-community-title" className="flex flex-col gap-4">
          <h2 id="standards-community-title" className={H2}>
            {community.heading}
          </h2>
          <div className="flex flex-col gap-[3px]">
            <p className={`${BODY} max-w-[1092px] text-login-accent`}>{community.intro}</p>
            <p className={`${BODY} text-white`}>{community.notice}</p>
          </div>
          <ol className={`mt-[11px] mb-[13px] list-outside list-decimal pl-[35px] ${LIST_ITEM}`}>
            {community.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>
        <hr className="m-0 h-px border-0 bg-login-divider" />
        <section aria-labelledby="standards-security-title" className="flex flex-col gap-4">
          <h2 id="standards-security-title" className={H2}>
            {security.heading}
          </h2>
          <div>
            <p className={`${BODY} text-white`}>{security.statement}</p>
            <ul className={`mt-[3px] list-outside list-disc pl-6 ${LIST_ITEM}`}>
              {security.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p className={`${BODY} text-login-accent`}>{security.contact}</p>
        </section>
      </div>
    </div>
  );
}
