import type { ReactNode } from "react";
import { ROW_LABEL } from "./compose-field-styles";

type Props = { children: ReactNode; required?: boolean; htmlFor?: string; id?: string; className?: string };

/* Figma "Title" (416:5550): auto-layout row, gap 2px, items centered: 22/28 Montserrat 700 label + red asterisk (Noto Sans JP 16/20 700). A <label> when it names a control, else a <span>. */
export function FieldLabel({ children, required, htmlFor, id, className: extra = "" }: Props) {
  const content = (
    <>
      {children}
      {required && (
        <span aria-hidden="true" className="font-noto-sans-jp text-base leading-5 font-bold text-[#cf1322]">
          *
        </span>
      )}
    </>
  );
  const className = `${ROW_LABEL} inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap ${extra}`;
  return htmlFor ? (
    <label htmlFor={htmlFor} id={id} className={className}>
      {content}
    </label>
  ) : (
    <span id={id} className={className}>
      {content}
    </span>
  );
}
