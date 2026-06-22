export type Customer = {
  // ---- Official portfolio columns (new order - 27 fields) ----
  "رقم الحساب"?: string | null;
  "مبلغ المديونية"?: number | null;
  NOTE?: string | null;
  Note?: string | null; // fallback
  الاكشن?: string | null;
  "الرقم الوظيفي للمحصل"?: string | null;
  "اسم المحصل"?: string | null;
  "الرقم الوظيفي للمشرف"?: string | null;
  "اسم المشرف"?: string | null;
  "نوع المنتج"?: string | null;
  "تاريخ التجميد"?: string | null;
  jWO_DT?: string | null;
  "عمر الدين"?: string | number | null;
  "رقم الهوية"?: string | null;
  "اسم العميل"?: string | null;
  "رقم الجوال"?: string | null;
  "عميل متوفي"?: string | null;
  "عميل رواتب"?: string | null;
  "تقييم أعمال"?: string | null;
  "سند غير مؤرشف"?: string | null;
  "رقم القضية"?: string | null;
  "اسم المحكمة"?: string | null;
  "رقم مرجع الحجز التنفيذي"?: string | null;
  "أرصدة محجوزة"?: string | number | null;
  السداد?: string | number | null;
  "رقم طلب سبيل"?: string | null;
  "نوع الطلب"?: string | null;
  الوصف?: string | null;

  // ---- Legacy aliases (mirrored for backward compat with older UI code) ----
  المبلغ?: number | null;
  المنتج?: string | null;
  "عدد ايام التعثر"?: string | number | null;
  "ارصدة محجوزه"?: string | number | null;
  "ارصده محجوزه"?: string | number | null;
  "رقم طلب سيبل"?: string | null;
  "مرجع الحجز التنفيذي"?: string | null;
  "رقم الطلب في نظام سيبل"?: string | null;
  "طلب الطلب"?: string | null;
  "jWO-DT"?: string | null;
  // ---- Deprecated legacy fields (kept optional so older references compile) ----
  "CaseNo. رقم القضية"?: string | null;
  "طلب اعفاء"?: string | null;
  "رقم الطلب"?: string | null;
  "تصنيف الطلب"?: string | null;
  "حالة الطلب الفرعية"?: string | null;
  "عدد الطلبات على رقم هوية العميل"?: number | null;
  "تاريخ فتح الطلب"?: string | null;
  "تيم جدة / تيم الرياض"?: string | null;
  // Allow arbitrary additional fields (legacy/dynamic Arabic columns)
  [key: string]: string | number | null | undefined;
};

export type ContactLog = {
  date: string; // ISO
  channel: "call" | "whatsapp" | "sms" | "other";
  note?: string;
};

export type CustomerState = {
  contacted: boolean;
  lastContactedAt?: string;
  notes?: string;
  noteLog?: { date: string; text: string }[];
  logs?: ContactLog[];
  edits?: Partial<Customer>;
  hasExemption?: boolean;
  hasReschedule?: boolean;
  defaultDate?: string; // تاريخ التعثر (ISO yyyy-mm-dd)
  clientStatus?: "salary" | "death" | "none"; // حالة العميل
};

export const customerKey = (c: Customer) =>
  c["رقم الحساب"] || c["رقم الهوية"] || c["اسم العميل"] || "";

export function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  let s = String(p).replace(/\D/g, "");
  if (!s) return null;
  // Saudi: convert 05xxxxxxxx → 9665xxxxxxxx
  if (s.startsWith("05") && s.length === 10) s = "966" + s.slice(1);
  if (s.startsWith("5") && s.length === 9) s = "966" + s;
  if (s.startsWith("009665")) s = s.slice(2);
  return s;
}

export function formatPhone(p?: string | null): string {
  const n = normalizePhone(p);
  if (!n) return "—";
  if (n.startsWith("966") && n.length === 12) {
    return `+966 ${n.slice(3, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
  }
  return "+" + n;
}

export function formatCurrency(n?: number | string | null): string {
  if (n == null) return "—";
  const clean = typeof n === "string" ? n.replace(/,/g, "") : n;
  if (typeof clean === "string" && clean.trim() === "") return "—";
  const num = Number(clean);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Money display formatter. Always returns thousand-separators + 2 decimals,
 * or "" for empty/invalid values (never "0.00" for empty input).
 * Use for: مبلغ المديونية، أرصدة محجوزة، السداد — display only.
 */
export function formatMoney(n?: number | string | null): string {
  if (n == null) return "";
  const s = typeof n === "string" ? n.replace(/,/g, "").trim() : n;
  if (s === "" ) return "";
  const num = Number(s);
  if (!isFinite(num)) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Live-formatting helper for money inputs: keeps user's partial decimals
 *  (e.g. "1234." → "1,234.") and clamps to 2 fractional digits. */
export function formatMoneyInput(raw: string): string {
  if (raw == null) return "";
  let v = String(raw).replace(/,/g, "").replace(/[^0-9.]/g, "");
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  if (v === "" || v === ".") return v;
  const [intPart, decPartRaw] = v.split(".");
  const grouped = (intPart || "0").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
  if (decPartRaw === undefined) return grouped;
  const decPart = decPartRaw.slice(0, 2);
  return `${grouped}.${decPart}`;
}

/** Strip formatting back to a raw numeric string for storage. */
export function parseMoneyInput(raw: string): string {
  if (raw == null) return "";
  return String(raw).replace(/,/g, "").replace(/[^0-9.]/g, "");
}
