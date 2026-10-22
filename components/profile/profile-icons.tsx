const SLOTS = [0, 1, 2, 3, 4, 5];

/*
 * Icon collection row of both Profile frames (Figma `mms_A.3_Huy Hiệu` 362:5064 and the title 3053:10052): six 80x64 cells
 * 16px apart, each a 64px circle with a 2px white ring on #323231, then the 22/28 white heading 32px below. The Secret Box is
 * not built, so every circle stays grey and unlabelled on both faces. On a phone the cells share the row and the circles shrink.
 */
export function ProfileIcons({ title }: { title: string }) {
  return (
    // mm:362:5064
    <section data-testid="profile-icons" aria-labelledby="profile-icons-title" className="flex w-full flex-col items-center gap-8">
      <div aria-hidden className="grid w-full grid-cols-6 gap-2 sm:w-fit sm:grid-cols-[repeat(6,80px)] sm:gap-4">
        {SLOTS.map((slot) => (
          <div key={slot} className="flex justify-center">
            {/* mm:I362:5066;3053:10046 */}
            <span data-testid="profile-icon-slot" className="block aspect-square w-full max-w-16 rounded-full border-2 border-white bg-[#323231]" />
          </div>
        ))}
      </div>
      {/* mm:3053:10052 */}
      <h2 id="profile-icons-title" className="text-center text-lg leading-7 font-bold break-words text-white md:text-[22px]">
        {title}
      </h2>
    </section>
  );
}
