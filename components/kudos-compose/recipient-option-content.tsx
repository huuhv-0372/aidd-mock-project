import Image from "next/image";
import type { SunnerOption } from "./write-kudo-types";

/*
 * One Người nhận suggestion (frame QIMJNgFb8K has no MoMorph image; measured from the owner's screenshot, issue #17):
 * 40px avatar with a white ring (grey placeholder when the Sunner has none), the name in bold white, the department
 * below it in muted grey (no line when unset). Google avatars skip the image optimiser, as on the Kudo card.
 */
export function RecipientOptionContent({ item }: { item: SunnerOption }) {
  return (
    <>
      <span
        data-testid="recipient-option-avatar"
        className="block size-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#eee]"
      >
        {item.avatar_url && <Image src={item.avatar_url} alt="" width={40} height={40} unoptimized className="size-full object-cover" />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span data-testid="recipient-option-name" className="break-words">
          {item.full_name}
        </span>
        {item.department && (
          <span data-testid="recipient-option-department" className="truncate text-sm leading-5 tracking-[0.1px] text-kudos-muted">
            {item.department}
          </span>
        )}
      </span>
    </>
  );
}
