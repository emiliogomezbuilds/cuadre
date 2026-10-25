// Server-side input validation helpers (Security Floor: every form validates its input).
// Nothing from a form or a file goes into the database or a prompt without passing through here.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuid(v: unknown): string | null {
  return typeof v === "string" && UUID.test(v) ? v : null;
}

/** Plain text with length limits; strips control characters and trims. Returns null when out of range. */
export function text(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return t.length >= min && t.length <= max ? t : null;
}

/** Non-negative decimal with an upper bound. Accepts a decimal comma. Returns null when invalid. */
export function num(v: unknown, min: number, max: number): number | null {
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim().replace(",", ".") : "";
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
