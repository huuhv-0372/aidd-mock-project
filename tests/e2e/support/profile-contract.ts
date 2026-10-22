// Profile selector + copy contract for tests/e2e/profile.spec.ts. The UI (phase 02a) and the data layer (02b) must match it
// exactly; this file is the single source. Decisions: plans/261021-profile/clarifications.md (Session 2 overrides Session 1).
// Plan: plans/261021-profile/plan.md. Fixtures: support/profile-fixtures.mjs (profile_card, kudos_profile_feed).
//
// Routes: /profile = the signed-in Sunner's own profile ("self"); /profile/<id> = another Sunner ("other").
// /profile/<own sub> redirects to /profile. Copy is VI by default and EN through the NEXT_LOCALE cookie.
// Roles and accessible names first; data-testid only where listed below.

export const PROFILE_PATH = "/profile";
export const profilePath = (id: string) => `/profile/${id}`;

export const PROFILE = {
  /** <section>. h1 = full name; the department code is visible text. The avatar, Hero badge and stars sit inside it. */
  hero: "profile-hero",
  /** The avatar circle: an <img> when avatar_url is set, else an empty placeholder circle. Always rendered, never zero-size. */
  avatar: "profile-avatar",
  /** The Hero tier pill (HeroBadge, shared with the board). Tier "new" is text ("New Hero"); rising / super / legend are an
   *  artwork whose alt is the label ("Rising Hero" / "Super Hero" / "Legend Hero"). Absent at 0 Kudos (tier "none"). */
  heroBadge: "profile-hero-badge",
  /** Hoa-thi stars: one aria-hidden <svg> per star (10 Kudos = 1, 20 = 2, 50 = 3). Absent below 10 Kudos. */
  heroStars: "profile-hero-stars",
  /** <section> with an h2 heading and exactly six `profile-icon-slot` children. All grey (Secret Box is deferred). */
  icons: "profile-icons",
  iconSlot: "profile-icon-slot",
  /** The board's KudosStatsPanel, reused unchanged. Self only. */
  stats: "kudos-stats",
  /** <section>: eyebrow, h2 "KUDOS", the direction control (self) or the static count (other), then the card feed. */
  kudos: "profile-kudos",
  /** Self only: the direction dropdown trigger (a button). Its visible text is the current option label. */
  kudosFilter: "profile-kudos-filter",
} as const;

/** Copy. VI first, EN second. The functions fill `{name}` / `{n}` exactly as shown. */
export const PROFILE_TXT = {
  eyebrow: "Sun* Annual Awards 2025",
  kudosHeading: "KUDOS",
  pageTitle: {
    self: { vi: "Hồ sơ của tôi | SAA 2025", en: "My profile | SAA 2025" },
    /** Both locales. */
    other: (name: string) => `${name} | SAA 2025`,
  },
  iconsHeading: {
    self: { vi: "Bộ sưu tập icon của tôi", en: "My icon collection" },
    other: {
      vi: (name: string) => `Bộ sưu tập icon của ${name}`,
      en: (name: string) => `${name}'s icon collection`,
    },
  },
  /** Other profile only. Opens the Viết Kudo modal with the recipient already filled. "tới", not "đến". */
  writeBar: {
    vi: (name: string) => `Gửi lời cám ơn và ghi nhận tới ${name}`,
    en: (name: string) => `Send thanks and recognition to ${name}`,
  },
  /** The dropdown trigger and its first option. Counts come from kudos_my_stats (self). */
  received: { vi: (n: number) => `Đã nhận (${n})`, en: (n: number) => `Received (${n})` },
  /** The dropdown's second option (self only). */
  sent: { vi: (n: number) => `Đã gửi (${n})`, en: (n: number) => `Sent (${n})` },
  /** Other profile only: a static line, no dropdown. */
  receivedCount: { vi: (n: number) => `Đã nhận: ${n} Kudos`, en: (n: number) => `Received: ${n} Kudos` },
  /** Empty received list (both faces). Same wording as the board. */
  emptyReceived: "Hiện tại chưa có Kudos nào.",
  /** Empty sent list (self only). */
  emptySent: { vi: "Bạn chưa gửi Kudos nào.", en: "You haven't sent any Kudos yet." },
  /** Shown after the last page of the feed. Same wording as the board's end line. */
  feedEnd: "Bạn đã xem hết Kudos.",
  /** Must never appear on another Sunner's profile: their sent count includes anonymous Kudos they sent. */
  sentWord: "Đã gửi",
  /** Statistics button, reused from the board (`aria-disabled`, see TXT.statLabels in kudos-contract.ts). */
  secretBox: "Mở Secret Box",
};
