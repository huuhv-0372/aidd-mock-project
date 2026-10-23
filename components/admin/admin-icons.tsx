import type { SVGProps } from "react";

/* Mono icons for the Admin - User screen. Sort carets are the Figma exports (caret-up / caret-down, 11x11); the rest are drawn to the
 * measured size of the png. All take their colour from the parent's text colour (currentColor). */
type IconProps = SVGProps<SVGSVGElement>;

const base = { fill: "none", "aria-hidden": true } as const;

/** Sort caret pointing up (Figma `caret-up`, fill #D9D9D9 in the design). */
export function IconCaretUp(props: IconProps) {
  return (
    <svg {...base} width="11" height="11" viewBox="0 0 11 11" {...props}>
      <path
        d="M9.69214 7.63879L5.7236 3.03703C5.61 2.90531 5.39128 2.90531 5.27647 3.03703L1.30793 7.63879C1.1605 7.81039 1.29343 8.06175 1.5315 8.06175H9.46858C9.70664 8.06175 9.83957 7.81039 9.69214 7.63879Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Sort caret pointing down (Figma `caret-down`). */
export function IconCaretDown(props: IconProps) {
  return (
    <svg {...base} width="11" height="11" viewBox="0 0 11 11" {...props}>
      <path
        d="M9.46858 2.93824H1.5315C1.29343 2.93824 1.1605 3.1896 1.30793 3.3612L5.27647 7.96297C5.39007 8.09469 5.6088 8.09469 5.7236 7.96297L9.69214 3.3612C9.83957 3.1896 9.70664 2.93824 9.46858 2.93824Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Black drop-down triangle of the filter fields (10x5 inside a 24px box, as the png shows it). */
export function IconDropdownArrow(props: IconProps) {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24" {...props}>
      <path d="M7 10l5 5 5-5z" fill="currentColor" />
    </svg>
  );
}

/** Magnifier of the Search field. */
export function IconSearch(props: IconProps) {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24" {...props}>
      <path
        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Round "..." of the Actions column: a 20px ring with three dots. */
export function IconMoreCircle(props: IconProps) {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="16" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
