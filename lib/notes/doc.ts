// Notes are rich-text documents (TipTap / ProseMirror JSON). Scripture cards are block nodes inside the doc,
// so each verse sits exactly where it was written. Older notes (version 1, a list of blocks) are converted on load.
import type { Block, Verse } from "@/lib/types";

export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};
export type Doc = { type: "doc"; content: DocNode[] };

export type ScriptureAttrs = { reference: string; translation: string; verses: Verse[]; ai?: boolean };

export const emptyDoc = (): Doc => ({ type: "doc", content: [{ type: "paragraph" }] });

function paragraphs(text: string): DocNode[] {
  return text.split("\n").map((line) => (line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" }));
}

/** v1 blocks -> doc */
export function blocksToDoc(blocks: Block[] | undefined): Doc {
  const content: DocNode[] = [];
  for (const b of blocks ?? []) {
    if (b.type === "text") {
      if (b.text) content.push(...paragraphs(b.text));
    } else {
      content.push({ type: "scripture", attrs: { reference: b.reference, translation: b.translation, verses: b.verses } });
    }
  }
  if (!content.length || content[content.length - 1].type === "scripture") content.push({ type: "paragraph" });
  return { type: "doc", content };
}

/** Whatever is stored in notes.content -> a doc to edit. */
export function contentToDoc(content: { version?: number; doc?: Doc; blocks?: Block[] } | null | undefined): Doc {
  if (content?.doc?.type === "doc" && Array.isArray(content.doc.content)) return content.doc;
  return blocksToDoc(content?.blocks);
}

function walk(node: DocNode, visit: (n: DocNode) => void) {
  visit(node);
  node.content?.forEach((c) => walk(c, visit));
}

/** Plain text for search and for the AI (scripture included as "[John 3:16] verse text"). */
export function docText(doc: Doc): string {
  const out: string[] = [];
  for (const block of doc.content) {
    if (block.type === "scripture") {
      const a = block.attrs as ScriptureAttrs;
      out.push(`[${a.reference}] ${(a.verses ?? []).map((v) => v.text).join(" ")}`);
      continue;
    }
    const parts: string[] = [];
    walk(block, (n) => {
      if (n.type === "text" && n.text) parts.push(n.text);
      if (n.type === "hardBreak") parts.push("\n");
    });
    const line = parts.join("");
    if (line) out.push(block.type === "heading" ? `# ${line}` : line);
  }
  return out.join("\n");
}

export function countScriptures(doc: Doc): number {
  let n = 0;
  walk(doc as DocNode, (x) => {
    if (x.type === "scripture") n++;
  });
  return n;
}
