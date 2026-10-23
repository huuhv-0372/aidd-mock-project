import { adminExportHref } from "@/lib/admin/admin-users-href";
import type { AdminUserFilters } from "@/lib/admin/admin-user-types";
import { FOCUS_ON_GREY } from "./admin-class-names";

/*
 * Export button of Figma 773:26407 (#FFEA9E, dark text, 52px tall). A plain download link to the CSV route with the current
 * filters and sort (page dropped): no client code. `download` makes the browser save the file instead of navigating.
 */
export function AdminExportLink({ filters, label }: { filters: AdminUserFilters; label: string }) {
  return (
    // mm:773:26407 (Export)
    <a
      href={adminExportHref(filters)}
      download
      data-testid="admin-export"
      className={`flex h-[52px] min-w-11 shrink-0 items-center justify-center rounded bg-login-accent px-[18px] text-base leading-6 font-bold text-login-bg hover:bg-[#fff3c4] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_ON_GREY}`}
    >
      {label}
    </a>
  );
}
