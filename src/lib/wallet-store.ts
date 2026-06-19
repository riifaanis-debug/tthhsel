import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, CustomerState, ContactLog } from "./wallet-types";
import { customerKey } from "./wallet-types";
import { getSession } from "@/components/LoginGate";
import defaultData from "@/data/wallet.json";
import { getWalletCustomers } from "./wallet.functions";
import { clearWalletCustomers, appendWalletCustomers } from "./wallet-write.functions";

type Meta = { fileName?: string; uploadedAt?: string; count: number };

const ARABIC_FIELDS: (keyof Customer)[] = [
  "رقم الحساب",
  "مبلغ المديونية",
  "NOTE",
  "Note",
  "الاكشن",
  "الرقم الوظيفي للمحصل",
  "اسم المحصل",
  "الرقم الوظيفي للمشرف",
  "اسم المشرف",
  "نوع المنتج",
  "تاريخ التجميد",
  "jWO_DT",
  "عمر الدين",
  "رقم الهوية",
  "اسم العميل",
  "رقم الجوال",
  "عميل متوفي",
  "عميل رواتب",
  "تقييم أعمال",
  "سند غير مؤرشف",
  "رقم القضية",
  "اسم المحكمة",
  "رقم مرجع الحجز التنفيذي",
  "أرصدة محجوزة",
  "السداد",
  "رقم طلب سبيل",
  "نوع الطلب",
  "الوصف",

  // ---- Legacy mirrors & backward compatibility ----
  "المبلغ",
  "المنتج",
  "عدد ايام التعثر",
  "jWO-DT",
  "hwo_DT",
  "HWO_DT",
  "تقييم الأعمال",
  "رقم طلب سيبل",
  "مرجع الحجز التنفيذي",
  "ارصدة محجوزه",
  "ارصده محجوزه",
  "عميل مشترك",
  "طلب جدولة",
  "رقم الطلب",
  "تصنيف الطلب",
  "حالة الطلب الفرعية",
  "عدد الطلبات على رقم هوية العميل",
  "تاريخ فتح الطلب",
  "التثبيت",
  "تيم جدة / تيم الرياض",
  "CaseNo. رقم القضية",
  "طلب اعفاء",
  "رقم الطلب في نظام سيبل",
];

const RAW_ONLY_FIELDS: (keyof Customer | "ID AGENT")[] = [
  "NOTE",
  "Note",
  "الاكشن",
  "اسم المحصل",
  "الرقم الوظيفي للمشرف",
  "اسم المشرف",
  "تاريخ التجميد",
  "jWO_DT",
  "jWO-DT",
  "تقييم أعمال",
  "تقييم الأعمال",
  "سند غير مؤرشف",
  "رقم القضية",
  "CaseNo. رقم القضية",
  "اسم المحكمة",
  "رقم مرجع الحجز التنفيذي",
  "مرجع الحجز التنفيذي",
  "أرصدة محجوزة",
  "ارصدة محجوزه",
  "ارصده محجوزه",
  "السداد",
  "رقم طلب سبيل",
  "رقم طلب سيبل",
  "رقم الطلب في نظام سيبل",
  "نوع الطلب",
  "الوصف",
  "طلب الطلب",
  "طلب اعفاء",
  "طلب جدولة",
  "رقم الطلب",
  "تصنيف الطلب",
  "حالة الطلب الفرعية",
  "ID AGENT",
];

function hasValue(v: unknown) {
  return v != null && String(v).trim() !== "";
}

function compactCustomerRaw(c: Customer) {
  const raw: Record<string, unknown> = {};
  for (const field of RAW_ONLY_FIELDS) {
    const value = (c as any)[field];
    if (hasValue(value)) raw[field] = value;
  }
  return raw;
}

function rowToCustomer(row: any): Customer {
  // Merge compact raw fields with indexed columns so the UI has the same
  // Arabic shape without downloading a duplicated full Excel row for every record.
  const raw = row.raw && typeof row.raw === "object" ? row.raw : {};
  const src = {
    ...raw,
    "رقم الحساب": row.account_number ?? raw["رقم الحساب"],
    "رقم الهوية": row.national_id ?? raw["رقم الهوية"],
    "اسم العميل": row.customer_name ?? raw["اسم العميل"],
    "رقم الجوال": row.phone ?? raw["رقم الجوال"],
    "مبلغ المديونية": row.amount ?? raw["مبلغ المديونية"],
    المبلغ: row.amount ?? raw["المبلغ"] ?? raw["مبلغ المديونية"],
    "نوع المنتج": row.product ?? raw["نوع المنتج"],
    المنتج: row.product ?? raw["المنتج"] ?? raw["نوع المنتج"],
    "عمر الدين": row.debt_age ?? raw["عمر الدين"],
    "عدد ايام التعثر": row.debt_age ?? raw["عدد ايام التعثر"] ?? raw["عمر الدين"],
    الاكشن: row.action ?? raw["الاكشن"],
    التثبيت: row.installment ?? raw["التثبيت"],
    "عميل رواتب": row.is_salary ? "نعم" : raw["عميل رواتب"],
    "عميل متوفي": row.is_deceased ? "نعم" : raw["عميل متوفي"],
    "الرقم الوظيفي للمحصل": row.agent_employee_id ?? raw["الرقم الوظيفي للمحصل"],
    "ID AGENT": row.agent_employee_id ?? raw["ID AGENT"],
  };
  const out: any = {};
  for (const f of ARABIC_FIELDS) out[f] = src[f] ?? null;
  out["ID AGENT"] = src["ID AGENT"] ?? src["الرقم الوظيفي للمحصل"] ?? null;
  return out as Customer;
}

function customerToDbRow(c: Customer, importedBy: string | null) {
  const isYes = (v: any) => {
    if (v == null) return false;
    const s = String(v).trim().toUpperCase();
    if (!s) return false;
    const isNoValue = ["NO", "0", "FALSE", "لا", "غير", "-", "NON", "NULL", "UNDEFINED"].includes(
      s,
    );
    if (isNoValue) return false;
    if (s === "YES" || s === "TRUE" || s === "Y" || s === "1" || s === "نعم") return true;
    if (s.includes("SALARY") || s.includes("PAYROLL") || s.includes("راتب") || s.includes("رواتب"))
      return true;
    if (s.includes("DEATH") || s.includes("DECEASED") || s.includes("وفا") || s.includes("متوف"))
      return true;
    return s.startsWith("YES") || s.startsWith("TRUE");
  };
  const key = customerKey(c);
  const amt = c["مبلغ المديونية"] ?? c["المبلغ"];
  return {
    customer_key: String(key),
    account_number: c["رقم الحساب"] ? String(c["رقم الحساب"]) : null,
    national_id: c["رقم الهوية"] ? String(c["رقم الهوية"]) : null,
    customer_name: c["اسم العميل"] ?? null,
    phone: c["رقم الجوال"] ? String(c["رقم الجوال"]) : null,
    amount: amt != null && !isNaN(Number(amt)) ? Number(amt) : null,
    product: c["نوع المنتج"] ?? c["المنتج"] ?? null,
    debt_age: ((c["عدد ايام التعثر"] ?? c["عمر الدين"]) as any) ?? null,
    action: c["الاكشن"] ?? null,
    installment: c["التثبيت"] ?? null,
    is_salary: isYes(c["عميل رواتب"]),
    is_deceased: isYes(c["عميل متوفي"]),
    agent_employee_id:
      (c as any)["ID AGENT"] ??
      c["الرقم الوظيفي للمحصل"] ??
      (c as any)["agent_employee_id"] ??
      null,
    raw: compactCustomerRaw(c),
    imported_by: importedBy,
  };
}

export function useWallet() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<Meta>({ count: 0, fileName: "محفظة سحابية" });
  const [hydrated, setHydrated] = useState(false);
  const loadWalletCustomers = useServerFn(getWalletCustomers);
  const clearCustomersFn = useServerFn(clearWalletCustomers);
  const appendCustomersFn = useServerFn(appendWalletCustomers);

  const loadFnRef = useRef(loadWalletCustomers);
  const clearFnRef = useRef(clearCustomersFn);
  const appendFnRef = useRef(appendCustomersFn);

  useEffect(() => {
    loadFnRef.current = loadWalletCustomers;
    clearFnRef.current = clearCustomersFn;
    appendFnRef.current = appendCustomersFn;
  });

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setCustomers([]);
      setMeta({ count: 0, fileName: "لا توجد جلسة" });
      setHydrated(true);
      return;
    }
    try {
      const data = await loadFnRef.current({
        data: { role: session.role, employeeId: session.employeeId },
      });
      const list = (data || []).map(rowToCustomer);
      setCustomers(list);
      const latest = (data || []).reduce(
        (acc: string | undefined, r: any) =>
          acc && new Date(acc) > new Date(r.imported_at) ? acc : r.imported_at,
        undefined,
      );
      setMeta({
        count: list.length,
        fileName: list.length ? "محفظة سحابية" : "لا توجد بيانات",
        uploadedAt: latest,
      });
    } catch (error) {
      console.error("load customers", error);
      setCustomers([]);
      setMeta({ count: 0, fileName: "خطأ في التحميل" });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceData = useCallback(
    async (next: Customer[], fileName?: string) => {
      const session = getSession();
      if (!session || session.role !== "admin") {
        throw new Error("الإدارة فقط يمكنها استبدال المحفظة");
      }
      const rows = next.map((c) => ({
        ...customerToDbRow(c, null),
        file_month: fileName || null,
      }));
      const dedup = new Map<string, any>();
      for (const r of rows) {
        if (r.customer_key) dedup.set(r.customer_key, r);
      }
      const finalRows = Array.from(dedup.values()).map((r) => ({
        ...r,
        agent_employee_id: r.agent_employee_id != null ? String(r.agent_employee_id) : null,
        account_number: r.account_number != null ? String(r.account_number) : null,
        national_id: r.national_id != null ? String(r.national_id) : null,
        phone: r.phone != null ? String(r.phone) : null,
        debt_age: r.debt_age != null ? String(r.debt_age) : null,
      }));

      const withTimeout = async <T>(
        promise: Promise<T>,
        ms: number,
        errorMsg: string,
      ): Promise<T> => {
        let timeoutId: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(errorMsg));
          }, ms);
        });
        try {
          const res = await Promise.race([promise, timeoutPromise]);
          clearTimeout(timeoutId);
          return res;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      };

      console.log("[replaceData] Starting process on client. Rows count:", finalRows.length);

      // Step 1: Clear current table (TRUNCATE — instant)
      console.log("[replaceData] Requesting server to clear customers...");
      await withTimeout(
        clearFnRef.current({ data: { employeeId: session.employeeId } }),
        60000,
        "انتهت مهلة مسح المحفظة السابقة (60 ثانية).",
      );

      // Step 2: Append rows in larger chunks now that payloads are compact.
      const CHUNK = 5000;
      for (let i = 0; i < finalRows.length; i += CHUNK) {
        const slice = finalRows.slice(i, i + CHUNK);
        const chunkNum = Math.floor(i / CHUNK) + 1;
        const totalChunks = Math.ceil(finalRows.length / CHUNK);
        console.log(
          `[replaceData] Requesting server to insert chunk ${chunkNum}/${totalChunks}...`,
        );
        await withTimeout(
          appendFnRef.current({
            data: { employeeId: session.employeeId, rows: slice },
          }),
          90000,
          `انتهت مهلة حفظ جزء البيانات ${chunkNum}/${totalChunks} (90 ثانية).`,
        );
      }

      console.log("[replaceData] All inserts successfully completed. Updating local data pool...");
      const localList = finalRows.map(rowToCustomer);
      setCustomers(localList);
      setMeta({
        count: localList.length,
        fileName: fileName || "محفظة سحابية",
        uploadedAt: new Date().toISOString(),
      });
      setHydrated(true);
      console.log("[replaceData] Completed successfully.");
    },
    [load],
  );

  const resetData = useCallback(async () => {
    await replaceData(defaultData as Customer[], "محفظة افتراضية");
  }, [replaceData]);

  return { customers, meta, hydrated, replaceData, resetData, reload: load };
}

export function useCustomerStates() {
  const [states, setStates] = useState<Record<string, CustomerState>>({});
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void (async () => {
      const { data, error } = await supabase.from("customer_states").select("*").limit(50000);
      if (error) {
        console.error("load states", error);
        return;
      }
      const map: Record<string, CustomerState> = {};
      for (const r of data || []) {
        map[r.customer_key] = {
          contacted: !!r.contacted,
          lastContactedAt: r.last_contacted_at ?? undefined,
          notes: r.notes ?? undefined,
          hasExemption: !!r.has_exemption,
          hasReschedule: !!r.has_reschedule,
          defaultDate: r.default_date ?? undefined,
          clientStatus: (r.client_status as any) ?? undefined,
          edits: (r.edits as any) ?? undefined,
        };
      }
      // Load logs grouped by customer_key
      const { data: logs } = await supabase
        .from("contact_logs")
        .select("customer_key, channel, note, created_at")
        .order("created_at", { ascending: true })
        .limit(50000);
      for (const l of logs || []) {
        const cur = map[l.customer_key] || { contacted: false };
        cur.logs = [
          ...(cur.logs || []),
          { date: l.created_at, channel: l.channel as any, note: l.note ?? undefined },
        ];
        map[l.customer_key] = cur;
      }
      // Load notes
      const { data: noteRows } = await supabase
        .from("customer_notes")
        .select("customer_key, text, created_at")
        .order("created_at", { ascending: true })
        .limit(50000);
      for (const n of noteRows || []) {
        const cur = map[n.customer_key] || { contacted: false };
        cur.noteLog = [...(cur.noteLog || []), { date: n.created_at, text: n.text }];
        map[n.customer_key] = cur;
      }
      setStates(map);
    })();
  }, []);

  const update = useCallback((key: string, patch: Partial<CustomerState>) => {
    setStates((prev) => {
      const cur = prev[key] || { contacted: false };
      const merged = { ...cur, ...patch };
      void supabase
        .from("customer_states")
        .upsert(
          {
            customer_key: key,
            contacted: merged.contacted ?? false,
            last_contacted_at: merged.lastContactedAt ?? null,
            notes: merged.notes ?? null,
            has_exemption: merged.hasExemption ?? false,
            has_reschedule: merged.hasReschedule ?? false,
            default_date: merged.defaultDate ?? null,
            client_status: merged.clientStatus ?? null,
            edits: merged.edits ?? null,
            updated_by: null,
          },
          { onConflict: "customer_key" },
        )
        .then(({ error }: { error: unknown }) => {
          if (error) console.error("upsert state", error);
        });
      // Persist note log additions
      if (patch.noteLog && patch.noteLog.length > (cur.noteLog?.length || 0)) {
        const newOnes = patch.noteLog.slice(cur.noteLog?.length || 0);
        void (async () => {
          for (const n of newOnes) {
            await supabase.from("customer_notes").insert({
              customer_key: key,
              text: n.text,
              created_by: null,
            });
          }
        })();
      }
      return { ...prev, [key]: merged };
    });
  }, []);

  const addLog = useCallback((key: string, log: ContactLog) => {
    setStates((prev) => {
      const cur = prev[key] || { contacted: false };
      const next = {
        ...prev,
        [key]: {
          ...cur,
          contacted: true,
          lastContactedAt: log.date,
          logs: [...(cur.logs || []), log],
        },
      };
      void (async () => {
        await supabase.from("contact_logs").insert({
          customer_key: key,
          channel: log.channel,
          note: log.note ?? null,
          created_by: null,
        });
        await supabase.from("customer_states").upsert(
          {
            customer_key: key,
            contacted: true,
            last_contacted_at: log.date,
          },
          { onConflict: "customer_key" },
        );
      })();
      return next;
    });
  }, []);

  return { states, update, addLog };
}
