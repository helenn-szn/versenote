// Only allow redirects back to our own pages (prevents open-redirect abuse of ?next=).
export function safeNext(next: string | null | undefined, fallback = "/notes"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
