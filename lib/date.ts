export type DateLike = string | number | Date | null | undefined;

const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value: DateLike): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Treat date-only strings as LOCAL dates to avoid timezone day-shift.
  if (ISO_DATE_ONLY_RE.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map((p) => Number(p));
    const local = new Date(y, (m || 1) - 1, d || 1);
    return isNaN(local.getTime()) ? null : local;
  }

  // Fallback: let JS parse ISO timestamps, RFC, etc.
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: DateLike): string {
  const date = parseDate(value);
  if (!date) return "";

  // Force DD/MM/YYYY regardless of device locale.
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function toISODateStringLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}
