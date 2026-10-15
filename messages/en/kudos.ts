import type { Dictionary } from "../vi";

/*
 * EN of the Sun* Kudos Live board. Text comes from Figma localizations (`list_file_localizations`, fileKey
 * 9ypp4enmFmdK3YAFJLIu6C) unless marked "not from Figma"; those are listed in
 * plans/261015-1010-sun-kudos-live-board/reports/en-localizations.md. Proper names stay identical.
 */
const eyebrow = "Sun* Annual Awards 2025";
const empty = /* not from Figma */ "There are no Kudos yet.";

const card = {
  person: {
    anonymous: /* not from Figma */ "Anonymous",
    heroTips: {
      new: {
        label: "New Hero",
        headline: /* not from Figma */ "1–4 people send you Kudos",
        body: "The journey of spreading goodness begins – the first words of thanks and acknowledgment have reached you.",
      },
      rising: {
        label: "Rising Hero",
        headline: "5-9 people send you Kudos",
        body: "Your image is growing in the hearts of teammates through your kindness and dedication.",
      },
      super: {
        label: "Super Hero",
        headline: "10–20 people send you Kudos",
        body: /* not from Figma */ "You have become a trusted and beloved symbol, always ready to help and remembered by many teammates.",
      },
      legend: {
        label: "Legend Hero",
        headline: "More than 20 people send you Kudos",
        body: "You have become a legend – leaving an unforgettable mark on the team through your heart and actions.",
      },
    },
    starTips: [
      /* not from Figma */ "This Sunner has received 10 Kudos and is starting to spread warm energy to everyone around them.",
      /* not from Figma */ "This Sunner has received 20 Kudos and shows their influence through positive actions every day.",
      /* not from Figma */ "This Sunner has received 50 Kudos and has become a role model of recognition, sharing and the Sun* spirit.",
    ] as [string, string, string],
  },
  hearts: { label: /* not from Figma */ "{count} likes" },
  copyLink: { label: "Copy Link", toast: "Link copied — ready to share!" },
};

export const kudos: Dictionary["kudos"] = {
  metaTitle: "Sun* Kudos",
  kv: {
    title: "The system records and thanks",
    logoAlt: "KUDOS",
  },
  compose: {
    placeholder: "Today, who would you like to thank and acknowledge?",
    searchPlaceholder: "Search for Sunner profile",
  },
  highlight: {
    eyebrow,
    title: "HIGHLIGHT KUDOS",
    empty,
    filters: {
      hashtag: "Hashtag",
      department: "Department",
      hashtagList: /* not from Figma */ "Hashtag list",
      departmentList: /* not from Figma */ "Department list",
    },
    carousel: {
      regionLabel: /* not from Figma */ "Highlight Kudos",
      prev: /* not from Figma */ "Previous Kudo",
      next: /* not from Figma */ "Next Kudo",
      slidePrev: /* not from Figma */ "Previous slide",
      slideNext: /* not from Figma */ "Next slide",
    },
    card: { viewDetails: "View Details", ...card },
    error: /* not from Figma */ "Could not load Highlight Kudos.",
  },
  spotlight: {
    eyebrow,
    title: "SPOTLIGHT BOARD",
    unit: "KUDOS",
    searchLabel: "Search",
    panZoomLabel: /* not from Figma */ "Pan/Zoom",
    empty,
    noResults: /* not from Figma */ "No Sunner found.",
    loadError: /* not from Figma */ "Could not load the Spotlight Board.",
    tickerSuffix: /* not from Figma */ "received a new Kudos",
    unknownName: "Sunner",
  },
  allKudos: {
    eyebrow,
    title: "ALL KUDOS",
    empty,
    error: /* not from Figma */ "Could not load the Kudos list. Please try again later.",
    feed: {
      loading: /* not from Figma */ "Loading more Kudos...",
      end: /* not from Figma */ "You have seen all Kudos.",
      error: /* not from Figma */ "Could not load more Kudos.",
      retry: /* not from Figma */ "Retry",
    },
    card: {
      ...card,
      gallery: {
        openImage: /* not from Figma */ "View image {index}/{total}",
        imageAlt: /* not from Figma */ "Attached image",
        closeImage: /* not from Figma */ "Close image",
      },
    },
    stats: {
      labels: [
        "Number of Kudos you received:",
        "Number of Kudos you've sent:",
        "Number of likes you received:",
        "Number of Secret Boxes opened:",
        "Number of Secret Boxes unopened:",
      ],
      openBox: "Open Secret Box",
      error: /* not from Figma */ "Could not load your stats.",
    },
    gifts: {
      title: /* not from Figma */ "10 LATEST GIFT\nRECIPIENTS",
      empty: /* not from Figma */ "No data yet",
      receivedPrefix: "Received",
      listLabel: /* not from Figma */ "Latest Sunner gift recipients",
      error: /* not from Figma */ "Could not load the gift recipients.",
    },
  },
};
