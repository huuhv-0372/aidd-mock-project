import { forbidden } from "next/navigation";

/* Public preview of the 403 page. forbidden() runs before anything streams, so the response is a
 * real HTTP 403 rendered by app/[locale]/forbidden.tsx. */
export default function ForbiddenPage(): never {
  forbidden();
}
