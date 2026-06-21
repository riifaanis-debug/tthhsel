import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ShieldCheck,
  Upload,
  UserPlus,
  Inbox,
  ArrowRight,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Scale,
  FileText,
  RefreshCw,
  LogOut,
  Eraser,
  Users,
  Lock,
  Unlock,
  KeyRound,
} from "lucide-react";
import PermissionsPanel from "@/components/PermissionsPanel";
import { toast } from "sonner";
import { useWallet } from "@/lib/wallet-store";
import collectors from "@/data/collectors.json";
import { formatCurrency, type Customer } from "@/lib/wallet-types";
import { RequestsUploadPanel, WalletChangesPanel } from "@/components/AdminPanels";
import MappingReview, { loadDefaultMapping } from "@/components/MappingReview";
import { detectMapping } from "@/lib/mapping-engine";
import { canonicalToCustomer } from "@/lib/canonical-to-customer";
import { clearSession, DISABLED_KEY } from "@/components/LoginGate";
import { useServerFn } from "@tanstack/react-start";
import { getCollectorsStats } from "@/lib/collectors-stats.functions";
import { clearWalletCustomers } from "@/lib/wallet-write.functions";
import {
  listWalletBackups,
  restoreWalletBackup,
  deleteWalletBackup,
} from "@/lib/wallet-backups.functions";
import { Archive, RotateCcw } from "lucide-react";

type Collector = { supervisor: string; collector: string; employeeId: string };
const BASE_COLLECTORS = collectors as Collector[];

const EXTRA_KEY = "wallet:collectors:extra";
const REQ_KEY = "wallet:thirdparty:requests";

type ThirdPartyReq = {
  id: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  customerName: string;
  customerId: string;
  settlementAmount: number;
  salary: string;
  employer: string;
  region: string;
  city: string;
  ahli: any[];
  otherBanks: any[];
  obligation: number;
  totalDebt: number;
  documents: { salary: string | null; simah: string | null; najez: string | null };
  collector: { name?: string; employeeId?: string; supervisor?: string } | null;
  body: string;
};

type Tab = "home" | "wallet" | "requests-file" | "changes" | "members" | "requests" | "collectors" | "permissions" | "backups";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          {tab !== "home" ? (
            <Button variant="ghost" size="icon" onClick={() => setTab("home")} aria-label="رجوع">
              <ArrowRight className="size-5" />
            </Button>
          ) : (
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <ShieldCheck className="size-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">لوحة تحكم الإدارة</h1>
            <p className="text-xs text-muted-foreground truncate">
              {tab === "home" && "اختر الإجراء المطلوب"}
              {tab === "wallet" && "إضافة المحفظة كاملة"}

              {tab === "requests-file" && "إضافة ملف الطلبات"}
              {tab === "changes" && "إضافة تغييرات على المحفظة الحالية"}
              {tab === "members" && "إضافة أعضاء في القروب"}
              {tab === "requests" && "طلبات إرسال العملاء للطرف الثالث"}
              {tab === "collectors" && "بيانات المحصلين"}
              {tab === "permissions" && "صلاحيات المحصلين"}
              {tab === "backups" && "النسخ الاحتياطية للمحافظ"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearSession();
              toast.success("تم تسجيل الخروج");
            }}
            className="gap-1.5 shrink-0"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        {tab === "home" && <HomeGrid onSelect={setTab} />}
        {tab === "wallet" && <WalletUploadPanel />}
        {tab === "requests-file" && <RequestsUploadPanel />}
        {tab === "changes" && <WalletChangesPanel />}
        {tab === "members" && <MembersPanel />}
        {tab === "requests" && <RequestsPanel />}
        {tab === "collectors" && <CollectorsDataPanel />}
        {tab === "permissions" && <PermissionsPanel />}
        {tab === "backups" && <BackupsPanel />}
      </main>
    </div>
  );
}

function HomeGrid({ onSelect }: { onSelect: (t: Tab) => void }) {
  const clearWalletFn = useServerFn(clearWalletCustomers);
  const pendingCount = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem(REQ_KEY) || "[]") as ThirdPartyReq[];
      return all.filter((r) => r.status === "pending").length;
    } catch {
      return 0;
    }
  }, []);

  const tiles: { id: Tab; title: string; desc: string; icon: any; badge?: number }[] = [
    {
      id: "wallet",
      title: "إضافة المحفظة كاملة",
      desc: "رفع ملف Excel لاستبدال بيانات المحفظة",
      icon: Upload,
    },

    {
      id: "requests-file",
      title: "إضافة ملف الطلبات",
      desc: "رفع ملف الطلبات (إعفاء/جدولة)",
      icon: FileText,
    },
    {
      id: "changes",
      title: "إضافة تغييرات على المحفظة الحالية",
      desc: "استبعاد / تدوير / تحديث الحسابات",
      icon: RefreshCw,
    },
    {
      id: "members",
      title: "إضافة أعضاء في القروب",
      desc: "تفعيل المحصلين للوصول إلى القروب",
      icon: UserPlus,
    },
    {
      id: "requests",
      title: "استقبال طلبات الطرف الثالث",
      desc: "مراجعة الطلبات المقدمة من المحصلين",
      icon: Inbox,
      badge: pendingCount,
    },
    {
      id: "collectors",
      title: "بيانات المحصلين",
      desc: "عرض المحصلين وإحصائياتهم وتمكين/إغلاق الدخول",
      icon: Users,
    },
    {
      id: "permissions",
      title: "صلاحيات المحصلين",
      desc: "التحكم بصلاحيات العرض والحساب والتصدير والإدارة",
      icon: KeyRound,
    },
  ];

  const clearCache = async () => {
    if (
      !confirm(
        "سيتم تصفير جميع بيانات المحفظة وحسابات وسداد ووعود جميع المحصلين، وتفريغ ذاكرة الجهاز المؤقتة. هل تريد المتابعة؟",
      )
    )
      return;
    try {
      const sessionRaw = localStorage.getItem("wallet:session");
      let employeeId = "";
      try {
        employeeId = sessionRaw ? (JSON.parse(sessionRaw)?.employeeId || "") : "";
      } catch {}

      // 1) Wipe DB tables (customers, customer_states, customer_notes, contact_logs)
      try {
        await clearWalletFn({ data: { employeeId } });
      } catch (e: any) {
        toast.error("تعذر تصفير بيانات قاعدة البيانات: " + (e?.message || ""));
        return;
      }

      // 2) Clear local cache (keep session)
      localStorage.clear();
      if (sessionRaw) localStorage.setItem("wallet:session", sessionRaw);
      sessionStorage.clear();
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (typeof indexedDB !== "undefined" && (indexedDB as any).databases) {
        const dbs = await (indexedDB as any).databases();
        await Promise.all(
          (dbs || []).map((d: any) =>
            d?.name
              ? new Promise((res) => {
                  const req = indexedDB.deleteDatabase(d.name);
                  req.onsuccess = req.onerror = req.onblocked = () => res(null);
                })
              : null,
          ),
        );
      }
      toast.success("تم تصفير جميع بيانات المحصلين وتفريغ الذاكرة");
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error("تعذر التصفير: " + (e?.message || ""));
    }
  };

  return (
    <div className="grid gap-3">
      {tiles.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className="text-right rounded-2xl border bg-card p-4 hover:bg-accent transition flex items-center gap-4 shadow-sm"
        >
          <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <t.icon className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base flex items-center gap-2">
              {t.title}
              {t.badge ? (
                <Badge variant="destructive" className="h-5 text-[10px]">
                  {t.badge}
                </Badge>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
          </div>
        </button>
      ))}
      <button
        onClick={clearCache}
        className="text-right rounded-2xl border border-destructive/30 bg-destructive/5 p-4 hover:bg-destructive/10 transition flex items-center gap-4 shadow-sm"
      >
        <div className="size-12 rounded-xl bg-destructive/10 text-destructive grid place-items-center shrink-0">
          <Eraser className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base text-destructive">تصفير وتفريغ الذاكرة</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            مسح جميع بيانات المحصلين (الحسابات، السداد، الوعود) وتنظيف الذاكرة
          </div>
        </div>
      </button>
    </div>
  );
}

// ---------- Smart column mapping ----------
function normHeader(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "") // Arabic diacritics
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_\-\.\/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FIELD_ALIASES: Record<string, string[]> = {
  "رقم الحساب": [
    "رقم الحساب",
    "account",
    "account number",
    "acc no",
    "رقم العقد",
    "contract",
    "contract number",
  ],
  المبلغ: [
    "المبلغ",
    "amount",
    "balance",
    "رصيد",
    "مبلغ المديونيه",
    "مبلغ المديونية",
    "اجمالي المديونيه",
    "اجمالي المديونية",
    "outstanding",
    "total due",
  ],
  الاكشن: ["الاكشن", "action", "حاله المتابعه", "حالة المتابعة", "متابعه", "status"],
  التثبيت: ["التثبيت", "تثبيت", "fix"],
  المنتج: ["المنتج", "product", "نوع المنتج", "type"],
  "عمر الدين": ["عمر الدين", "debt age", "age"],
  "رقم الهوية": ["رقم الهويه", "رقم الهوية", "id", "national id", "هويه", "هوية"],
  "اسم العميل": ["اسم العميل", "customer", "customer name", "client name", "name", "العميل"],
  "رقم الجوال": ["رقم الجوال", "جوال", "mobile", "phone", "tel", "تلفون", "موبايل"],
  "عميل رواتب": ["عميل رواتب", "راتب", "salary", "salary customer"],
  "عميل متوفي": ["عميل متوفي", "متوفي", "متوفى", "deceased", "وفاه", "وفاة"],
  "رقم القضية": ["رقم القضيه", "رقم القضية", "case", "case number"],
  "رقم الطلب في نظام سيبل": ["رقم الطلب في نظام سيبل", "سيبل", "siebel", "siebel id"],
  "طلب الطلب": [
    "طلب الطلب",
    "وعد السداد",
    "promise",
    "promise to pay",
    "ptp",
    "تاريخ وعد السداد",
    "وعد",
  ],
  "ارصده محجوزه": ["ارصده محجوزه", "ارصدة محجوزة", "held", "blocked balance"],
};

const AGENT_ALIASES = [
  "id agent",
  "agent id",
  "agent employee id",
  "agent_employee_id",
  "الرقم الوظيفي",
  "الرقم الوظيفى",
  "رقم الموظف",
  "رقم المحصل",
  "employee id",
  "employee number",
  "موظف",
  "محصل id",
];
const AGENT_NAME_ALIASES = ["اسم المحصل", "المحصل", "collector", "agent", "agent name"];

function buildHeaderMap(headers: string[]) {
  const normed = headers.map((h) => ({ orig: h, n: normHeader(h) }));
  const find = (aliases: string[]): string | null => {
    const set = aliases.map(normHeader);
    const exact = normed.find((h) => set.includes(h.n));
    if (exact) return exact.orig;
    const partial = normed.find((h) => set.some((a) => h.n.includes(a) || a.includes(h.n)));
    return partial?.orig || null;
  };
  const map: Record<string, string | null> = {};
  for (const k of Object.keys(FIELD_ALIASES)) map[k] = find(FIELD_ALIASES[k]);
  map["__agent"] = find(AGENT_ALIASES);
  map["__agentName"] = find(AGENT_NAME_ALIASES);
  return map;
}

function rowToCustomerSmart(
  row: any,
  hmap: Record<string, string | null>,
): Customer & { ID_AGENT?: string | null } {
  const out: any = {};
  for (const k of Object.keys(FIELD_ALIASES)) {
    const src = hmap[k];
    let v = src ? row[src] : null;
    if (
      v != null &&
      ["رقم الحساب", "رقم الهوية", "رقم القضية", "رقم الجوال", "رقم الطلب في نظام سيبل"].includes(k)
    ) {
      const num = Number(v);
      v = Number.isFinite(num) && !isNaN(num) ? String(Math.trunc(num)) : String(v);
    }
    if (k === "المبلغ" && v != null) {
      const num = Number(String(v).replace(/,/g, ""));
      v = isNaN(num) ? null : num;
    }
    out[k] = v ?? null;
  }
  const agentRaw = hmap["__agent"] ? row[hmap["__agent"]] : null;
  if (agentRaw != null && String(agentRaw).trim() !== "") {
    const n = Number(agentRaw);
    out["ID AGENT"] =
      Number.isFinite(n) && !isNaN(n) ? String(Math.trunc(n)) : String(agentRaw).trim();
  }
  return out;
}

function summarize(rows: any[]) {
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
  const total = rows.reduce((s, r) => s + (Number(r["المبلغ"]) || 0), 0);
  const agents = new Set(rows.map((r) => r["ID AGENT"]).filter(Boolean));
  const salary = rows.filter((r) => isYes(r["عميل رواتب"])).length;
  const death = rows.filter((r) => isYes(r["عميل متوفي"])).length;
  const promises = rows.filter((r) => r["طلب الطلب"]).length;
  const products: Record<string, number> = {};
  for (const r of rows) {
    const p = String(r["المنتج"] || "").toUpperCase();
    if (!p) continue;
    let key = p;
    if (p.includes("PF") || p.includes("شخص")) key = "PF";
    else if (p.includes("AL") || p.includes("سياره") || p.includes("سيارة")) key = "AL";
    else if (p.includes("CC") || p.includes("ائتم") || p.includes("بطاق")) key = "CC";
    products[key] = (products[key] || 0) + 1;
  }
  return { count: rows.length, total, agents: agents.size, salary, death, promises, products };
}

function WalletUploadPanel() {
  const { meta, replaceData, hydrated } = useWallet();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    rows: Customer[];
    fileName: string;
    summary: ReturnType<typeof summarize>;
    headersDetected: Record<string, string | null>;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewState, setReviewState] = useState<null | {
    fileName: string;
    headers: string[];
    rawRows: Record<string, unknown>[];
    detection: ReturnType<typeof detectMapping>;
  }>(null);

  const handleUpload = async (file: File) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });
      if (raw.length === 0) {
        toast.error("الملف فارغ");
        return;
      }
      const headers = Object.keys(raw[0] || {});
      // Try saved default mapping first; fall back to auto-detection
      const savedDefault = await loadDefaultMapping("wallet");
      const detection = detectMapping(headers, raw);
      if (savedDefault) {
        // Overlay saved mapping over detection (saved wins for mapped fields that still exist)
        for (const m of detection.matches) {
          const sv = savedDefault[m.field];
          if (sv && headers.includes(sv)) {
            m.sourceColumn = sv;
            m.confidence = 1;
          }
        }
      }
      setReviewState({ fileName: file.name, headers, rawRows: raw, detection });
      toast.success(`تم تحليل ${raw.length} صف. راجع ربط الأعمدة ثم اعتمد.`);
    } catch (e: any) {
      toast.error("تعذر قراءة الملف: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  // Called from MappingReview after user confirms the field↔column mapping
  const handleMappingConfirmed = async (
    canonicalRows: any[],
    mapping: Record<string, string | null>,
  ) => {
    const customers = canonicalRows.map(canonicalToCustomer) as Customer[];
    const summary = summarize(customers);
    const headersDetected: Record<string, string | null> = {
      ...mapping,
      __agent: mapping["الرقم الوظيفي للمحصل"] || null,
    };
    setPreview({ rows: customers, fileName: reviewState!.fileName, summary, headersDetected });
    setReviewState(null);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await replaceData(preview.rows, preview.fileName);
      toast.success(`تم توزيع ${preview.rows.length} حساب على ${preview.summary.agents} محصّل`);
      setPreview(null);
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error("فشل الحفظ: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="text-sm">
        رفع ملف Excel جديد سيستبدل المحفظة الحالية بالكامل لجميع المستخدمين، ويتم توزيعها تلقائيًا
        حسب الرقم الوظيفي للمحصل.
      </div>
      {hydrated && !preview && (
        <div className="text-xs text-muted-foreground rounded-md border p-3 space-y-1">
          <div>
            الملف الحالي: <span className="font-medium text-foreground">{meta.fileName}</span>
          </div>
          <div>
            عدد العملاء:{" "}
            <span className="font-medium text-foreground tabular-nums">{meta.count}</span>
          </div>
          {meta.uploadedAt && (
            <div>
              آخر رفع:{" "}
              <span className="font-medium text-foreground">
                {new Date(meta.uploadedAt).toLocaleString("en-US")}
              </span>
            </div>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />
      {!preview && (
        <Button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full h-11">
          <Upload className="size-4 ml-2" />
          {busy ? "جاري التحليل…" : "اختيار ملف Excel"}
        </Button>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="text-sm font-semibold">ملخص المحفظة — {preview.fileName}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <StatBox
              label="إجمالي الحسابات"
              value={preview.summary.count.toLocaleString("en-US")}
            />
            <StatBox label="إجمالي المحفظة" value={formatCurrency(preview.summary.total)} />
            <StatBox label="عدد المحصلين" value={String(preview.summary.agents)} />
            <StatBox label="وعود السداد" value={String(preview.summary.promises)} />
            <StatBox label="عملاء رواتب" value={String(preview.summary.salary)} />
            <StatBox label="عملاء متوفين" value={String(preview.summary.death)} />
          </div>
          {Object.keys(preview.summary.products).length > 0 && (
            <div className="rounded-md border p-2 text-xs">
              <div className="font-semibold mb-1">توزيع المنتجات</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.summary.products).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="tabular-nums">
                    {k}: {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {!preview.headersDetected["__agent"] && (
            <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-800 p-2 text-[11px]">
              تحذير: لم يتم العثور على عمود الرقم الوظيفي للمحصل في الملف. لن يتم ربط الحسابات
              بالمحصلين.
            </div>
          )}
          <div className="rounded-md border max-h-56 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-1 text-right">العميل</th>
                  <th className="p-1 text-right">الهوية</th>
                  <th className="p-1 text-right">المنتج</th>
                  <th className="p-1 text-right">المبلغ</th>
                  <th className="p-1 text-right">المحصل</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 20).map((r: any, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1 truncate max-w-[120px]">{r["اسم العميل"] || "—"}</td>
                    <td className="p-1 tabular-nums">{r["رقم الهوية"] || "—"}</td>
                    <td className="p-1">{r["المنتج"] || "—"}</td>
                    <td className="p-1 tabular-nums">{formatCurrency(r["المبلغ"])}</td>
                    <td className="p-1 tabular-nums">{r["ID AGENT"] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPreview(null)} disabled={busy}>
              إلغاء
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={busy}>
              اعتماد التوزيع
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">تأكيد توزيع المحفظة</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed">
            هل تريد تأكيد توزيع هذه المحفظة على جميع المحصلين؟
            <br />
            بعد الموافقة سيتم ربط الحسابات بكل محصل حسب رقمه الوظيفي، وستظهر البيانات تلقائيًا في
            لوحة تحكم كل محصل عند تسجيل دخوله.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button onClick={handleConfirm} disabled={busy}>
              {busy ? "جاري الحفظ…" : "موافق وتوزيع المحفظة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {reviewState && (
        <MappingReview
          open={!!reviewState}
          onOpenChange={(v) => {
            if (!v) setReviewState(null);
          }}
          fileKind="wallet"
          fileName={reviewState.fileName}
          headers={reviewState.headers}
          rows={reviewState.rawRows}
          detection={reviewState.detection}
          onConfirm={handleMappingConfirmed}
        />
      )}
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function MembersPanel() {
  const [extras, setExtras] = useState<Collector[]>([]);
  const [group, setGroup] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    try {
      setExtras(JSON.parse(localStorage.getItem(EXTRA_KEY) || "[]"));
    } catch {}
    import("@/lib/messages-store").then(({ fetchGroupMembers }) => {
      fetchGroupMembers()
        .then(setGroup)
        .catch(() => {});
    });
  }, []);

  const all = useMemo(() => {
    const map = new Map<string, Collector>();
    [...BASE_COLLECTORS, ...extras].forEach((c) => map.set(c.employeeId, c));
    return Array.from(map.values());
  }, [extras]);

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!t) return all;
    return all.filter(
      (c) => c.collector.includes(t) || c.supervisor.includes(t) || c.employeeId.includes(t),
    );
  }, [all, q]);

  const toggle = async (eid: string) => {
    const { addGroupMember, removeGroupMember } = await import("@/lib/messages-store");
    setBusy(eid);
    try {
      if (group.includes(eid)) {
        await removeGroupMember(eid);
        setGroup((g) => g.filter((x) => x !== eid));
      } else {
        await addGroupMember(eid);
        setGroup((g) => Array.from(new Set([...g, eid])));
      }
    } catch (e: any) {
      toast.error("تعذّر التحديث: " + (e?.message ?? ""));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-2">
        <div className="text-xs text-muted-foreground">
          فعّل المحصلين الذين تريد إضافتهم إلى القروب. المحصل المفعّل فقط يمكنه فتح خانة القروب.
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو الرقم الوظيفي…"
          className="h-9"
        />
        <div className="text-[11px] text-muted-foreground">
          أعضاء القروب:{" "}
          <span className="font-bold text-foreground tabular-nums">{group.length}</span> /{" "}
          {all.length}
        </div>
      </Card>
      <Card className="p-2 max-h-[60vh] overflow-y-auto">
        <ul className="divide-y">
          {filtered.map((c) => {
            const inGroup = group.includes(c.employeeId);
            return (
              <li key={c.employeeId} className="flex items-center gap-3 py-2 px-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.collector}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {c.supervisor} · <span className="tabular-nums">{c.employeeId}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={inGroup ? "default" : "outline"}
                  onClick={() => toggle(c.employeeId)}
                  disabled={busy === c.employeeId}
                >
                  {inGroup ? "في القروب ✓" : "إضافة"}
                </Button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">لا توجد نتائج</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function RequestsPanel() {
  const [items, setItems] = useState<ThirdPartyReq[]>([]);
  const [open, setOpen] = useState<ThirdPartyReq | null>(null);

  const load = () => {
    try {
      setItems(JSON.parse(localStorage.getItem(REQ_KEY) || "[]"));
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = (id: string, status: ThirdPartyReq["status"]) => {
    const next = items.map((r) => (r.id === id ? { ...r, status } : r));
    setItems(next);
    localStorage.setItem(REQ_KEY, JSON.stringify(next));
    if (open?.id === id) setOpen({ ...open, status });
    toast.success(
      status === "approved" ? "تمت الموافقة" : status === "rejected" ? "تم الرفض" : "تم التحديث",
    );
  };

  const remove = (id: string) => {
    const next = items.filter((r) => r.id !== id);
    setItems(next);
    localStorage.setItem(REQ_KEY, JSON.stringify(next));
    if (open?.id === id) setOpen(null);
  };

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات حالياً</Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((r) => (
          <Card key={r.id} className="p-3">
            <div className="flex items-start gap-3">
              <StatusPill status={r.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold truncate">{r.customerName}</div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{r.id}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  هوية: <span className="tabular-nums">{r.customerId}</span> · إجمالي:{" "}
                  <span className="tabular-nums">{formatCurrency(r.totalDebt)}</span> SAR
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  من: {r.collector?.name || "—"}
                  {r.collector?.employeeId ? ` (${r.collector.employeeId})` : ""}
                  {" · "}
                  {new Date(r.createdAt).toLocaleString("en-US")}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(r)} aria-label="عرض">
                <Eye className="size-4" />
              </Button>
            </div>
            {r.status === "pending" && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")}>
                  <XCircle className="size-4 ml-1" /> رفض
                </Button>
                <Button size="sm" onClick={() => updateStatus(r.id, "approved")}>
                  <CheckCircle2 className="size-4 ml-1" /> موافقة
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تفاصيل الطلب {open?.id}</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <StatusPill status={open.status} />
                <span className="text-muted-foreground">
                  {new Date(open.createdAt).toLocaleString("en-US")}
                </span>
              </div>
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed font-sans">
                {open.body}
              </pre>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => remove(open.id)}>
                  <Trash2 className="size-4 ml-1" /> حذف
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(open.id, "rejected")}
                >
                  <XCircle className="size-4 ml-1" /> رفض
                </Button>
                <Button size="sm" onClick={() => updateStatus(open.id, "approved")}>
                  <CheckCircle2 className="size-4 ml-1" /> موافقة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusPill({ status }: { status: ThirdPartyReq["status"] }) {
  const map = {
    pending: {
      icon: Clock,
      label: "قيد المراجعة",
      cls: "bg-amber-100 text-amber-700 border-amber-200",
    },
    approved: {
      icon: CheckCircle2,
      label: "مقبول",
      cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    rejected: { icon: XCircle, label: "مرفوض", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  } as const;
  const m = map[status];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${m.cls}`}
    >
      <Icon className="size-3" /> {m.label}
    </span>
  );
}

// ============ Collectors Data Panel ============

type AggStat = {
  employeeId: string;
  accounts: number;
  walletTotal: number;
  promises: number;
  exemptions: number;
  reschedules: number;
  collected: number;
};

const DISABLED_DEFAULT_VERSION = "v2-all-closed";
const DISABLED_VERSION_KEY = "wallet:collectors:disabled:version";

function loadDisabled(): string[] {
  try {
    const all = (BASE_COLLECTORS as Collector[]).map((c) => c.employeeId);
    const version = localStorage.getItem(DISABLED_VERSION_KEY);
    const raw = localStorage.getItem(DISABLED_KEY);
    if (raw === null || version !== DISABLED_DEFAULT_VERSION) {
      // الافتراضي: جميع المحصلين مغلق دخولهم حتى يتم تمكينهم يدويًا.
      localStorage.setItem(DISABLED_KEY, JSON.stringify(all));
      localStorage.setItem(DISABLED_VERSION_KEY, DISABLED_DEFAULT_VERSION);
      return all;
    }
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : all;
  } catch {
    return (BASE_COLLECTORS as Collector[]).map((c) => c.employeeId);
  }
}

function CollectorsDataPanel() {
  const fetchStats = useServerFn(getCollectorsStats);
  const [stats, setStats] = useState<Record<string, AggStat>>({});
  const [disabled, setDisabled] = useState<string[]>(loadDisabled());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Collector | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchStats({ data: { employeeId: "666666" } });
      const map: Record<string, AggStat> = {};
      for (const s of data as AggStat[]) map[s.employeeId] = s;
      setStats(map);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const toggleDisabled = (eid: string) => {
    const next = disabled.includes(eid) ? disabled.filter((x) => x !== eid) : [...disabled, eid];
    setDisabled(next);
    localStorage.setItem(DISABLED_KEY, JSON.stringify(next));
    toast.success(next.includes(eid) ? "تم إغلاق دخول المحصل" : "تم تمكين دخول المحصل");
  };

  const list = useMemo(() => {
    const t = q.trim();
    let arr = BASE_COLLECTORS as Collector[];
    if (t) {
      arr = arr.filter(
        (c) => c.collector.includes(t) || c.employeeId.includes(t) || c.supervisor.includes(t),
      );
    }
    return [...arr].sort((a, b) => a.collector.localeCompare(b.collector, "ar"));
  }, [q]);

  const supervisorOf = (name: string) => BASE_COLLECTORS.find((c) => c.supervisor === name);

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-2">
        <div className="text-xs text-muted-foreground">
          يتم تحديث البيانات تلقائيًا كل بضع ثوانٍ. اضغط على اسم المحصل لعرض تفاصيله، واستخدم زر
          تمكين/إغلاق للتحكم في تسجيل الدخول.
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو الرقم الوظيفي…"
          className="h-9"
        />
        <div className="text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            الإجمالي: <span className="font-bold text-foreground tabular-nums">{list.length}</span>
          </span>
          <span>{loading ? "جاري التحميل…" : `مغلق: ${disabled.length}`}</span>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-right">
                <th className="p-2 font-semibold">اسم المحصل</th>
                <th className="p-2 font-semibold tabular-nums">الرقم الوظيفي</th>
                <th className="p-2 font-semibold text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const isDisabled = disabled.includes(c.employeeId);
                return (
                  <tr key={c.employeeId} className="border-t hover:bg-accent/40">
                    <td className="p-2">
                      <button
                        onClick={() => setOpen(c)}
                        className="text-right font-medium text-primary hover:underline"
                      >
                        {c.collector}
                      </button>
                    </td>
                    <td className="p-2 tabular-nums">{c.employeeId}</td>
                    <td className="p-2 text-center">
                      <Button
                        size="sm"
                        variant={isDisabled ? "destructive" : "outline"}
                        onClick={() => toggleDisabled(c.employeeId)}
                        className="h-7 px-2 text-[11px] gap-1"
                      >
                        {isDisabled ? (
                          <>
                            <Lock className="size-3" /> مغلق
                          </>
                        ) : (
                          <>
                            <Unlock className="size-3" /> ممكّن
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    لا توجد نتائج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">بيانات المحصل</DialogTitle>
          </DialogHeader>
          {open &&
            (() => {
              const s = stats[open.employeeId];
              const sup = supervisorOf(open.supervisor);
              const items = [
                { l: "اسم المحصل", v: open.collector },
                { l: "الرقم الوظيفي", v: open.employeeId },
                { l: "اسم المشرف", v: open.supervisor },
                { l: "الرقم الوظيفي للمشرف", v: sup?.employeeId || "—" },
                { l: "عدد الحسابات في المحفظة", v: s ? s.accounts.toLocaleString("en-US") : "—" },
                { l: "عدد وعود السداد", v: s ? String(s.promises) : "—" },
                { l: "عدد طلبات الإعفاء", v: s ? String(s.exemptions) : "—" },
                { l: "عدد طلبات الجدولة", v: s ? String(s.reschedules) : "—" },
                { l: "المحقق حتى الآن", v: s ? formatCurrency(s.collected) : "—" },
              ];
              return (
                <div className="space-y-2 text-sm">
                  {items.map((it) => (
                    <div
                      key={it.l}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <span className="text-muted-foreground text-xs">{it.l}</span>
                      <span className="font-semibold tabular-nums">{it.v}</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-muted-foreground text-center pt-1">
                    يتم تحديث البيانات تلقائيًا
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
