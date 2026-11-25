// Sermon dates are stored as plain dates (YYYY-MM-DD); format them without timezone shifts.
export function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(`${d.slice(0, 10)}T00:00:00Z`);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}
