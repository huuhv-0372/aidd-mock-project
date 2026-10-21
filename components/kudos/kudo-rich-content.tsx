import type { ReactNode } from "react";
import { parseKudoContent, type KudoBlock, type KudoInline } from "@/lib/kudos/kudo-content-blocks";

/**
 * A Kudo's stored Markdown-lite shown in full with its formatting (View Kudo). Server component: the content is parsed
 * into a tree (kudo-content-blocks.ts) and every piece of text goes through React, which escapes it — no raw HTML.
 * Links exist only for http(s) targets and open in a new tab without opener or referrer.
 * Unstyled on purpose: the blocks are direct children of the container, which owns spacing and marks
 * (RICH_CONTENT in kudo-detail-card.tsx).
 */
export function KudoRichContent({ markdown }: { markdown: string }) {
  return <>{renderBlocks(parseKudoContent(markdown))}</>;
}

function renderBlocks(blocks: KudoBlock[]): ReactNode[] {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "paragraph":
        return <p key={index}>{renderInlines(block.children)}</p>;
      case "list":
        return (
          <ol key={index} start={block.start}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderBlocks(item)}</li>
            ))}
          </ol>
        );
      case "quote":
        return <blockquote key={index}>{renderBlocks(block.children)}</blockquote>;
    }
  });
}

function renderInlines(nodes: KudoInline[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.text;
      case "strong":
        return <strong key={index}>{renderInlines(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInlines(node.children)}</em>;
      case "s":
        return <s key={index}>{renderInlines(node.children)}</s>;
      case "mention":
        return <strong key={index}>@{node.name}</strong>;
      case "link":
        return (
          <a key={index} href={node.href} target="_blank" rel="noopener noreferrer">
            {renderInlines(node.children)}
          </a>
        );
    }
  });
}
