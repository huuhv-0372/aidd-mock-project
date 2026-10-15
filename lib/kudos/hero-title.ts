export type HeroTier = "none" | "new" | "rising" | "super" | "legend";

/** Hero title by how many different people sent the recipient a Kudo (Figma hover frames). */
export function heroTier(distinctSenders: number): HeroTier {
  if (!(distinctSenders >= 1)) return "none";
  if (distinctSenders >= 21) return "legend";
  if (distinctSenders >= 10) return "super";
  if (distinctSenders >= 5) return "rising";
  return "new";
}

/** Stars next to a name by Kudos received (spec B.3.2): 10 -> 1, 20 -> 2, 50 -> 3. */
export function starCount(kudosReceived: number): 0 | 1 | 2 | 3 {
  if (kudosReceived >= 50) return 3;
  if (kudosReceived >= 20) return 2;
  if (kudosReceived >= 10) return 1;
  return 0;
}
