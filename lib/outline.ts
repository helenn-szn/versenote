// A sermon outline is stored as plain text, one point per line.
// Old outlines may use "1.", "-", "•" or "*" in front of each line; those marks are removed.
export function parseOutline(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*·▪◦]|\(?\d{1,2}[.)]|[a-zA-Z][.)](?=\s))\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

export function serializeOutline(points: string[]): string {
  return points.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}
