import { GUEST_CONTROL_WIDTH } from "./shell-class-names";

/*
 * Suspense fallback while the session is read: an empty box the size of the guest login link
 * (h-11, h-10 from lg), so a guest sees no layout shift and nobody sees the wrong controls flash.
 */
export function HeaderControlsPlaceholder() {
  return <div aria-hidden="true" className={`order-3 h-11 ${GUEST_CONTROL_WIDTH} shrink-0 lg:h-10`} />;
}
