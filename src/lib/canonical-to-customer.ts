import type { CanonicalRow } from "./canonical-schema";
import type { Customer } from "./wallet-types";
import { freezeFromJwo } from "./freeze-date";

// Bridges canonical rows (matching the official portfolio Excel columns) into the
// Customer shape used by the UI. Populates BOTH the official field names and
// the legacy aliases the older UI still reads from, so cards/filters stay in sync.
export function canonicalToCustomer(row: CanonicalRow): Customer & { "ID AGENT"?: string | null } {
  const get = (k: string) => row[k] ?? null;
  const num = (v: any) => (typeof v === "number" ? v : v == null ? null : Number(v));
  const yesNo = (v: any): string | null =>
    v === true ? "نعم" : v === false ? "لا" : v == null ? null : String(v);
  const str = (v: any): string | null => (v == null || v === "" ? null : String(v));

  const amount = num(get("مبلغ المديونية"));
  const note = str(get("NOTE")) ?? str(get("Note"));
  const debtAge = str(get("عمر الدين")) ?? (get("عمر الدين") as any);
  const product = get("نوع المنتج");
  const caseNo = get("رقم القضية");
  const held = num(get("أرصدة محجوزة")) ?? num(get("ارصدة محجوزه"));
  const paid = num(get("السداد"));
  const siebelReq = get("رقم طلب سبيل") ?? get("رقم طلب سيبل");

  return {
    // ---- Official 27 columns (in exact order) ----
    "رقم الحساب": get("رقم الحساب") as any,
    "مبلغ المديونية": amount,
    NOTE: note,
    Note: note, // fallback
    الاكشن: get("الاكشن") as any,
    "الرقم الوظيفي للمحصل": str(get("الرقم الوظيفي للمحصل")),
    "اسم المحصل": str(get("اسم المحصل")),
    "الرقم الوظيفي للمشرف": str(get("الرقم الوظيفي للمشرف")),
    "اسم المشرف": str(get("اسم المشرف")),
    "نوع المنتج": product as any,
    // تاريخ التجميد is ALWAYS derived from JWO_DT minus 3 calendar months —
    // any value present in the source file is ignored on purpose.
    "تاريخ التجميد": freezeFromJwo(get("jWO_DT")) || null,
    jWO_DT: str(get("jWO_DT")),

    "عمر الدين": debtAge,
    "رقم الهوية": get("رقم الهوية") as any,
    "اسم العميل": get("اسم العميل") as any,
    "رقم الجوال": get("رقم الجوال") as any,
    "عميل متوفي": yesNo(get("عميل متوفي")),
    "عميل رواتب": yesNo(get("عميل رواتب")),
    "تقييم أعمال": str(get("تقييم أعمال")),
    "سند غير مؤرشف": str(get("سند غير مؤرشف")),
    "رقم القضية": caseNo as any,
    "اسم المحكمة": get("اسم المحكمة") as any,
    "رقم مرجع الحجز التنفيذي": str(get("رقم مرجع الحجز التنفيذي")),
    "أرصدة محجوزة": held,
    السداد: paid,
    "رقم طلب سبيل": str(siebelReq),
    "نوع الطلب": str(get("نوع الطلب")),
    الوصف: str(get("الوصف")),

    // ---- Legacy aliases (kept so existing UI code keeps reading them) ----
    المبلغ: amount,
    المنتج: product as any,
    // "عمر الدين" already set above

    "عدد ايام التعثر": debtAge,
    "jWO-DT": str(get("jWO_DT")),
    "arصدة محجوزه": held,
    "ارصدة محجوزه": held,
    "ارصده محجوزه": held,
    "رقم طلب سيبل": str(siebelReq),
    "مرجع الحجز التنفيذي": str(get("رقم مرجع الحجز التنفيذي")),
    "رقم الطلب في نظام سيبل": str(siebelReq),

    // ---- Agent assignment hook for wallet-store ----
    "ID AGENT": get("الرقم الوظيفي للمحصل") as any,
  };
}
