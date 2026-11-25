// Read-only rendering of a note, for shared links. Mirrors the editor's look without loading the editor.
import type { ReactNode } from "react";
import type { Doc, DocNode, ScriptureAttrs } from "./doc";
import { VerseText } from "@/components/ScriptureCard";

function inline(nodes: DocNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((n, i) => {
    if (n.type === "hardBreak") return <br key={i} />;
    if (n.type !== "text") return null;
    let el: ReactNode = n.text;
    for (const m of n.marks ?? []) {
      if (m.type === "bold") el = <strong>{el}</strong>;
      else if (m.type === "italic") el = <em>{el}</em>;
      else if (m.type === "highlight") el = <mark>{el}</mark>;
      else if (m.type === "underline") el = <u>{el}</u>;
      else if (m.type === "strike") el = <s>{el}</s>;
    }
    return <span key={i}>{el}</span>;
  });
}

function block(n: DocNode, i: number): ReactNode {
  switch (n.type) {
    case "paragraph":
      return <p key={i}>{inline(n.content)}</p>;
    case "heading":
      return (n.attrs?.level as number) === 2 ? <h2 key={i}>{inline(n.content)}</h2> : <h3 key={i}>{inline(n.content)}</h3>;
    case "bulletList":
      return <ul key={i}>{n.content?.map(block)}</ul>;
    case "orderedList":
      return <ol key={i}>{n.content?.map(block)}</ol>;
    case "listItem":
      return <li key={i}>{n.content?.map(block)}</li>;
    case "blockquote":
      return <blockquote key={i}>{n.content?.map(block)}</blockquote>;
    case "horizontalRule":
      return <hr key={i} />;
    case "scripture": {
      const a = n.attrs as ScriptureAttrs;
      return (
        <div key={i} className="scripture in-note">
          <div className="ref">
            {a.reference}
            <small>{a.translation}</small>
          </div>
          <VerseText verses={a.verses ?? []} />
        </div>
      );
    }
    default:
      return null;
  }
}

export function RenderDoc({ doc }: { doc: Doc }) {
  return <div className="note-body read-only">{doc.content.map(block)}</div>;
}
