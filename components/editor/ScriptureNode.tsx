"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import type { Verse } from "@/lib/types";
import { VerseText } from "../ScriptureCard";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";

// A scripture card that lives inside the note, right where it was inserted.
// Its text is the Bible text exactly as fetched; it is not editable in the note.
function ScriptureView({ node, deleteNode, selected }: ReactNodeViewProps) {
  const { t } = useI18n();
  const { reference, translation, verses } = node.attrs as { reference: string; translation: string; verses: Verse[] };
  return (
    <NodeViewWrapper className={`scripture in-note ${selected ? "selected" : ""}`} data-drag-handle contentEditable={false}>
      <div className="ref">
        {reference}
        <small>{translation}</small>
      </div>
      <VerseText verses={verses ?? []} />
      <button
        type="button"
        className="btn ghost small remove"
        onClick={() => deleteNode()}
        aria-label={fmt(t.editor.remove, { ref: reference })}
      >
        ✕
      </button>
    </NodeViewWrapper>
  );
}

export const ScriptureNode = Node.create({
  name: "scripture",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      reference: { default: "" },
      translation: { default: "" },
      verses: {
        default: [],
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute("data-verses") ?? "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({ "data-verses": JSON.stringify(attrs.verses ?? []) }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-scripture]",
        getAttrs: (el) => ({
          reference: (el as HTMLElement).getAttribute("data-reference") ?? "",
          translation: (el as HTMLElement).getAttribute("data-translation") ?? "",
        }),
      },
    ];
  },

  // Copy/paste and export keep the reference and text together.
  renderHTML({ node, HTMLAttributes }) {
    const text = ((node.attrs.verses as Verse[]) ?? []).map((v) => v.text).join(" ");
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-scripture": "",
        "data-reference": node.attrs.reference,
        "data-translation": node.attrs.translation,
      }),
      `${node.attrs.reference} (${node.attrs.translation}) ${text}`,
    ];
  },

  renderText({ node }) {
    const text = ((node.attrs.verses as Verse[]) ?? []).map((v) => v.text).join(" ");
    return `${node.attrs.reference} (${node.attrs.translation})\n${text}\n`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ScriptureView);
  },
});
