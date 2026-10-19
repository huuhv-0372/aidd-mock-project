// Classes for the ProseMirror contenteditable. Tiptap renders plain HTML (p, strong, em, s, ol, blockquote, a, mention
// span), so the content styling and the placeholder (Placeholder extension -> p.is-editor-empty[data-placeholder]) are
// written as arbitrary descendant variants instead of global CSS.
const PLACEHOLDER =
  "[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:font-bold [&_p.is-editor-empty:first-child]:before:tracking-[0.15px] [&_p.is-editor-empty:first-child]:before:text-kudos-muted [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]";

const CONTENT =
  "[&_strong]:font-bold [&_em]:italic [&_s]:line-through [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-home-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-[#e46060] [&_a]:underline [&_[data-type=mention]]:rounded-sm [&_[data-type=mention]]:bg-[rgb(255_234_158/0.6)] [&_[data-type=mention]]:px-1 [&_[data-type=mention]]:font-bold";

/** Body text is medium weight so that the toolbar's bold stays visible (every other Figma text is 700). */
export const EDITOR_CLASS = `min-h-full px-[23px] py-0 text-base leading-6 font-medium tracking-[0.15px] text-login-bg outline-none ${PLACEHOLDER} ${CONTENT}`;
