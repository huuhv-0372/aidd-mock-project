import { Fragment } from "react";
import { IconDiamond, IconLicense, IconTarget } from "./awards-icons";
import type { AwardSectionData } from "./award-sections-data";

const LABEL = "text-2xl leading-8 font-bold text-login-accent";
const VALUE = "text-4xl leading-11 font-bold text-white";
const CAPTION = "text-sm leading-5 font-bold tracking-[0.1px] text-white";

const Divider = () => <div aria-hidden="true" className="h-px w-full bg-login-divider" />;

/* Right/left content column of an award card (Figma D.x.2): title, description, quantity, prize(s). */
export function AwardContent({ award }: { award: AwardSectionData }) {
  const { slug, title, paragraphs, alignLeft, quantity, prizes } = award;
  return (
    // mm:I313:8467;214:2526
    <div className="flex min-w-0 flex-1 flex-col gap-8">
      {/* mm:I313:8467;214:2527 */}
      <div className="flex flex-col gap-6">
        {/* mm:I313:8467;214:2528 */}
        <div className="flex items-center gap-4">
          <IconTarget className="size-6 shrink-0 text-white" />
          <h2 id={`${slug}-title`} className={LABEL}>
            {title}
          </h2>
        </div>
        {/* mm:I313:8467;214:2531 */}
        <div
          className={`flex flex-col gap-6 text-base leading-6 font-bold tracking-[0.5px] text-white ${alignLeft ? "text-left" : "text-justify"}`}
        >
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
      <Divider />
      {/* mm:I313:8467;214:2534 */}
      <div data-testid="award-quantity" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <IconDiamond className="size-6 shrink-0 text-white" />
        <p className={LABEL}>Số lượng giải thưởng:</p>
        {/* mm:I313:8467;214:3552 (number + unit; the literal space keeps "10 Cá nhân" in the text content) */}
        <p className="flex items-center gap-2">
          <span className={VALUE}>{quantity.value}</span> <span className={`w-[60px] ${CAPTION}`}>{quantity.unit}</span>
        </p>
      </div>
      <Divider />
      {/* mm:I313:8467;214:2540 (one block per prize line, "Hoặc" between them on Signature) */}
      {prizes.map((prize, index) => (
        <Fragment key={prize.value}>
          {index > 0 ? (
            // mm:313:8498
            <p className="flex items-center gap-2 text-sm leading-5 font-bold tracking-[0.1px] text-login-divider">
              Hoặc
              <span aria-hidden="true" className="h-px flex-1 bg-login-divider" />
            </p>
          ) : null}
          <div data-testid="award-prize" className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <IconLicense className="size-6 shrink-0 text-white" />
              <p className={LABEL}>Giá trị giải thưởng:</p>
            </div>
            <p className={VALUE}>{prize.value}</p>
            {prize.note ? <p className={CAPTION}>{prize.note}</p> : null}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
