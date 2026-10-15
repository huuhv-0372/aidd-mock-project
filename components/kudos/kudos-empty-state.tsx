/*
 * Message shown in place of a block with nothing to list ("Hiện tại chưa có Kudos nào.", "Chưa có dữ liệu")
 * or whose data failed to load (a generic text, never the raw error). White on the dark page and panels;
 * `className` adjusts spacing where the block needs it.
 */
export function KudosEmptyState({ message, className = "" }: { message: string; className?: string }) {
  return <p className={`px-4 py-8 text-center text-xl leading-8 font-bold text-white ${className}`.trim()}>{message}</p>;
}
