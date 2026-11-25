"use client";

import { useRef } from "react";
import { useI18n } from "@/lib/i18n/client";

// The pastor's outline as a bulleted list: Enter adds the next point, Backspace on an empty point removes it.
export default function OutlineEditor({ points, onChange }: { points: string[]; onChange: (p: string[]) => void }) {
  const { t } = useI18n();
  const M = t.manager;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const list = points.length ? points : [""];

  const focus = (i: number) => requestAnimationFrame(() => refs.current[i]?.focus());
  const update = (i: number, v: string) => onChange(list.map((p, j) => (j === i ? v : p)));
  const insertAfter = (i: number) => {
    const next = [...list.slice(0, i + 1), "", ...list.slice(i + 1)];
    onChange(next);
    focus(i + 1);
  };
  const remove = (i: number) => {
    const next = list.filter((_, j) => j !== i);
    onChange(next.length ? next : [""]);
    focus(Math.max(0, i - 1));
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    focus(j);
  };

  return (
    <div className="outline-editor">
      <ul>
        {list.map((p, i) => (
          <li key={i}>
            <span className="ol-dot" aria-hidden />
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="ol-input"
              value={p}
              maxLength={300}
              placeholder={i === 0 ? M.pointPh : ""}
              aria-label={`${M.point} ${i + 1}`}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertAfter(i);
                } else if (e.key === "Backspace" && !p && list.length > 1) {
                  e.preventDefault();
                  remove(i);
                } else if (e.key === "ArrowUp" && e.altKey) {
                  e.preventDefault();
                  move(i, -1);
                } else if (e.key === "ArrowDown" && e.altKey) {
                  e.preventDefault();
                  move(i, 1);
                }
              }}
            />
            <span className="ol-actions">
              <button type="button" className="btn ghost small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={M.up}>
                ↑
              </button>
              <button type="button" className="btn ghost small" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={M.down}>
                ↓
              </button>
              <button type="button" className="btn ghost small" onClick={() => remove(i)} aria-label={M.delete}>
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn secondary small" onClick={() => insertAfter(list.length - 1)}>
        + {M.addPoint}
      </button>
    </div>
  );
}
