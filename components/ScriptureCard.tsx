import type { Verse } from "@/lib/types";

export function VerseText({ verses }: { verses: Verse[] }) {
  const numbered = verses.length > 1;
  return (
    <div className="text">
      {verses.map((v, i) => (
        <span key={`${v.verse}-${i}`}>
          {numbered && v.verse > 0 && <span className="verse-num">{v.verse}</span>}
          {v.text}
          {i < verses.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
}

export default function ScriptureCard({
  reference,
  translation,
  verses,
  onRemove,
}: {
  reference: string;
  translation: string;
  verses: Verse[];
  onRemove?: () => void;
}) {
  return (
    <div className="scripture">
      <div className="ref">
        {reference}
        <small>{translation}</small>
      </div>
      <VerseText verses={verses} />
      {onRemove && (
        <button type="button" className="btn ghost small remove" onClick={onRemove} aria-label={`Remove ${reference}`}>
          ✕
        </button>
      )}
    </div>
  );
}
