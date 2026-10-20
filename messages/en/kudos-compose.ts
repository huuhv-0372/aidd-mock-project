import type { Dictionary } from "../vi";

/*
 * EN of the write-Kudos strings. Text comes from Figma localizations (`list_file_localizations`, fileKey
 * 9ypp4enmFmdK3YAFJLIu6C) unless marked "not from Figma"; those are listed in
 * plans/261019-1022-write-kudos/reports/en-localizations.md.
 */
export const kudosCompose: Dictionary["kudosCompose"] = {
  widget: { rules: /* not from Figma */ "Rules", writeKudo: "Write KUDOS", close: /* not from Figma */ "Close" },
  rulesDialog: { close: /* not from Figma */ "Close", writeKudo: "Write KUDOS" },
  rules: {
    title: "Rules",
    receiverHeading: "KUDOS Receiver: Hero badge for positive influence",
    receiverIntro: "Based on the number of Kudos sent by teammates, you will earn the corresponding Hero badge, displayed next to your profile name",
    heroes: [
      {
        label: "New Hero",
        range: "1-4 people send you Kudos",
        description: "The journey of spreading goodness begins – the first words of thanks and acknowledgment have reached you.",
      },
      {
        label: "Rising Hero",
        range: "5-9 people send you Kudos",
        description: "Your image is growing in the hearts of teammates through your kindness and dedication.",
      },
      {
        label: "Super Hero",
        range: "10–20 people send you Kudos",
        description: /* not from Figma */ "You have become a trusted and beloved icon, always ready to help and remembered by many teammates.",
      },
      {
        label: "Legend Hero",
        range: "More than 20 people send you Kudos",
        description: "You have become a legend – leaving an unforgettable mark on the team through your heart and actions.",
      },
    ],
    senderHeading: "Kudos Sender: Complete collection of 6 icons, receive a secret gift immediately",
    senderIntro:
      "Each Kudos you send will be posted on the system and receive ❤️ from the Sunner community. Every 5 ❤️, you can open a Secret Box with a chance to get one of 6 exclusive SAA icons.",
    badgeNames: ["REVIVAL", "TOUCH OF LIGHT", "STAY GOLD", "FLOW TO HORIZON", "BEYOND THE BOUNDARY", "ROOT FURTHER"],
    giftNote: /* Figma text has a typo ("Sunnercollecting") */ "Sunners who collect all 6 icons will receive a mysterious gift from SAA 2025.",
    nationalHeading: /* Figma: "NATION KUDOS", unified with the body below */ "NATIONAL KUDOS",
    nationalBody: "The 5 Kudos with the most ❤️ in all of Sun* will officially become National Kudos and receive a special gift from SAA 2025: Root Further.",
  },
  write: {
    title: "Send thanks and recognition to teammates",
    required: /* not from Figma */ "This field cannot be empty",
    recipient: {
      label: "Recipient",
      placeholder: "Search",
      /* not from Figma: */
      listLabel: "Recipient list",
      noResult: "No matching Sunner found",
      pickFromList: "Please choose a recipient from the suggestions",
    },
    kudoTitle: {
      label: "Title",
      placeholder: "Gift a title to a teammate",
      hint: /* not from Figma */ "e.g. The person who motivates me.\nThe title will be shown as your Kudos headline.",
    },
    toolbar: {
      bold: /* not from Figma */ "Bold",
      italic: /* not from Figma */ "Italic",
      strike: /* not from Figma */ "Strikethrough",
      orderedList: /* not from Figma */ "Numbered list",
      link: /* not from Figma */ "Insert link",
      quote: /* not from Figma */ "Quote",
      standards: "Community Standards",
    },
    editor: {
      label: /* not from Figma */ "Kudos message",
      placeholder: "Please send your thanks and recognition to your teammates here!",
      mentionHint: "You can '@ + name' to mention another colleague",
      mentionListLabel: /* not from Figma */ "Colleague suggestions",
    },
    hashtag: {
      label: "Hashtag",
      add: /* not from Figma */ "+ Hashtag",
      max: /* not from Figma */ "Max 5",
      listLabel: /* not from Figma */ "Hashtag list",
      remove: /* not from Figma */ "Remove hashtag",
      loadFailed: /* not from Figma */ "Couldn't load hashtags",
      retry: /* not from Figma */ "Retry",
    },
    image: { label: "Image", add: /* not from Figma */ "+ Image", max: /* not from Figma */ "Max 5", remove: /* not from Figma */ "Remove image" },
    anonymous: { label: "Send thanks and recognition anonymously", aliasLabel: /* not from Figma */ "Anonymous name" },
    actions: { cancel: "Cancel", send: "Send" },
    errors: {
      imageFormat: /* not from Figma */ "Invalid file format",
      imageSize: /* not from Figma */ "Image must be 5 MB or smaller",
      sendFailed: /* not from Figma */ "Couldn't send your Kudos, please try again.",
      contentTooLong: /* not from Figma */ "Content can be at most 5000 characters",
      invalid: /* not from Figma */ "Invalid value, please check and try again",
    },
    addLink: {
      // Spec CSV wording ("Add link" / "Text" / "Link"); the Figma EN localizations read "Add path" / "Content" / "URL".
      title: "Add link",
      textLabel: "Text",
      linkLabel: "Link",
      cancel: "Cancel",
      save: "Save",
      errors: {
        required: /* not from Figma */ "This field cannot be empty",
        textTooLong: /* not from Figma */ "Maximum 100 characters",
        linkTooShort: /* not from Figma */ "Minimum 5 characters",
        linkTooLong: /* not from Figma */ "Maximum 2048 characters",
        linkInvalid: /* not from Figma */ "Invalid link (only http or https)",
      },
    },
  },
};
