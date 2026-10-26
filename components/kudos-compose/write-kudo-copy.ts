// Every user-facing string of the Viết Kudo modal + Add link dialog. One typed object per locale lives in
// messages/{vi,en}/kudos-compose.ts (`write`); the page-level KudosComposer passes it down.

export type AddLinkCopy = {
  title: string;
  textLabel: string;
  linkLabel: string;
  cancel: string;
  save: string;
  errors: { required: string; textTooLong: string; linkTooShort: string; linkTooLong: string; linkInvalid: string };
};

export type WriteKudoCopy = {
  title: string;
  required: string;
  recipient: { label: string; placeholder: string; listLabel: string; noResult: string; pickFromList: string };
  kudoTitle: { label: string; placeholder: string; hint: string };
  toolbar: { bold: string; italic: string; strike: string; orderedList: string; link: string; quote: string; standards: string };
  editor: { label: string; placeholder: string; mentionHint: string; mentionListLabel: string; /** "{count}/5.000": {count} is replaced by the Markdown length. */ counter: string };
  hashtag: { label: string; add: string; max: string; listLabel: string; remove: string; loadFailed: string; retry: string };
  image: { label: string; add: string; max: string; remove: string };
  anonymous: { label: string; aliasLabel: string };
  actions: { cancel: string; send: string; save: string };
  /** Edit mode of the modal (plans/261022-edit-kudo): heading and the accessible name of the pencil on a card. */
  edit: { title: string; pencil: string };
  /** Toast after the modal closes on a successful Gửi (`sent`) or Lưu (`saved`). */
  success: { sent: string; saved: string };
  errors: { imageFormat: string; imageSize: string; sendFailed: string; saveFailed: string; contentTooLong: string; invalid: string };
  addLink: AddLinkCopy;
};
