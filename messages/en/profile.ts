import type { Dictionary } from "../vi";

/* English mirror of messages/vi/profile.ts. */
export const profile: Dictionary["profile"] = {
  metaTitleSelf: "My profile | SAA 2025", // not from Figma
  metaTitleOther: "{name} | SAA 2025", // not from Figma
  loadError: "Could not load the profile. Please try again later.", // not from Figma
  unknownName: "Sunner", // not from Figma
  icons: {
    titleSelf: "My icon collection",
    titleOther: "{name}'s icon collection",
  },
  writeBar: "Send thanks and recognition to {name}",
  kudos: {
    eyebrow: "Sun* Annual Awards 2025",
    title: "KUDOS",
    received: "Received ({count})",
    sent: "Sent ({count})",
    sentNoCount: "Sent", // not from Figma
    receivedStatic: "Received: {count} Kudos",
    directionList: "Kudos list", // not from Figma
    emptySent: "You haven't sent any Kudos yet.", // not from Figma
  },
};
