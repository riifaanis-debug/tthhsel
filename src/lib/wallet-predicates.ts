// Shared, strict predicates per the portfolio spec.
// USE THESE EVERYWHERE (dashboard counts AND wallet-view filtering)
// so the number on a card always matches the rows behind it.

const NULL_TOKENS = new Set(["", "-", "—", "–", "null", "undefined", "غير"]);

/** Trim + handle non-string. */
export function clean(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** "Yes"-ish only: yes/Yes/YES/true/TRUE/نعم  (NOT permissive — "No"/empty = false). */
export function isYesStrict(v: unknown): boolean {
  if (v === true) return true;
  const s = clean(v).toLowerCase();
  if (!s || NULL_TOKENS.has(s)) return false;
  return s === "yes" || s === "true" || s === "y" || s === "1" || s === "نعم";
}

/** Non-empty AND not a placeholder ("-", null, undefined…). */
export function isFilled(v: unknown): boolean {
  const s = clean(v).toLowerCase();
  if (!s) return false;
  return !NULL_TOKENS.has(s);
}

/** Normalize Arabic alif/hamza so "إعفاء" / "اعفاء" match. */
export function normalizeArabic(v: unknown): string {
  return clean(v)
    .replace(/[\u0623\u0625\u0622]/g, "\u0627") // أإآ → ا
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\s+/g, " ");
}

export function isExemptionRequest(reqType: unknown): boolean {
  const n = normalizeArabic(reqType);
  if (!n) return false;
  // Real file values include "إعفاء متوفين/معاقين" — match by substring,
  // not exact equality, so any "اعفاء…" variant counts.
  return n.includes("اعفاء");
}

export function isRescheduleRequest(reqType: unknown): boolean {
  const n = normalizeArabic(reqType);
  if (!n) return false;
  // Real file values include "إعادة جدولة الديون المتعثرة" — match any
  // string that contains "جدول".
  return n.includes("جدول");
}

/** Collapse any source variant into the two canonical labels. */
export function normalizeReqType(reqType: unknown): "إعفاء متوفين" | "إعادة جدولة" | "" {
  if (isExemptionRequest(reqType)) return "إعفاء متوفين";
  if (isRescheduleRequest(reqType)) return "إعادة جدولة";
  return "";
}

export function isPromise(action: unknown): boolean {
  return clean(action) === "وعد سداد";
}

/** Match a row to the current collector by BOTH employee id AND name. */
export function isOwnedByCollector(
  agentEmployeeId: unknown,
  agentName: unknown,
  sessionEmployeeId: string | null | undefined,
  sessionName: string | null | undefined,
): boolean {
  const eid = clean(sessionEmployeeId);
  const name = clean(sessionName).toLowerCase();
  if (!eid && !name) return false;
  const rowEid = clean(agentEmployeeId);
  const rowName = clean(agentName).toLowerCase();
  // Either match is enough (some files lack the id, others lack the name),
  // but at least one of the session sides must match a non-empty row side.
  if (eid && rowEid && rowEid === eid) return true;
  if (name && rowName && rowName === name) return true;
  return false;
}