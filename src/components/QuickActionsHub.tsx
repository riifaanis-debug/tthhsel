import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Inbox,
  Send,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Mic,
  StopCircle,
  Trash2,
  X,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { CollectorDashboard, type QuickKey } from "@/components/CollectorDashboard";
import { useWallet, useCustomerStates } from "@/lib/wallet-store";
import { freezeFromJwo, readJwo } from "@/lib/freeze-date";

import { customerKey, formatCurrency, type Customer } from "@/lib/wallet-types";

import { getSession } from "@/components/LoginGate";
import {
  isPromise,
  isExemptionRequest,
  isRescheduleRequest,
} from "@/lib/wallet-predicates";
import {
  addMessage,
  fetchGroupMembers,
  getAllCollectors,
  isInGroup,
  readMessages,
  writeMessages,
  type Attachment,
  type Message,
} from "@/lib/messages-store";
import groupAvatar from "@/assets/smart-collection.png.asset.json";

const isPromisePred = (c: Customer, st: any) =>
  isPromise(st?.edits?.["الاكشن"] ?? c["الاكشن"]);

const hasReqType = (c: Customer, st: any, kind: "exemption" | "reschedule") => {
  const reqType = st?.edits?.["نوع الطلب"] ?? (c as any)["نوع الطلب"];
  return kind === "exemption" ? isExemptionRequest(reqType) : isRescheduleRequest(reqType);
};

export function QuickActionsHub({
  collected,
  totalAccounts,
  totalBalance,
  filteredAccounts,
  filteredBalance,
  filteredPF,
  filteredAL,
  filteredCC,
  filteredSalary,
  filteredDeceased,
  filteredSibel,
}: {
  collected: number;
  totalAccounts: number;
  totalBalance: number;
  filteredAccounts: number;
  filteredBalance: number;
  filteredPF: number;
  filteredAL: number;
  filteredCC: number;
  filteredSalary: number;
  filteredDeceased: number;
  filteredSibel: number;
}) {
  const session = getSession();
  const employeeId = session?.employeeId;
  const [groupTick, setGroupTick] = useState(0);
  const groupEnabled = isInGroup(employeeId);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      fetchGroupMembers()
        .then(() => {
          if (alive) setGroupTick((t) => t + 1);
        })
        .catch(() => {});
    refresh();
    const onChange = () => setGroupTick((t) => t + 1);
    window.addEventListener("group-members-changed", onChange);
    const id = setInterval(refresh, 15000);
    return () => {
      alive = false;
      window.removeEventListener("group-members-changed", onChange);
      clearInterval(id);
    };
  }, []);
  void groupTick;

  const [open, setOpen] = useState<QuickKey | null>(null);
  const [walletFilter, setWalletFilter] = useState<QuickKey | null>(null);
  const [mailUnread, setMailUnread] = useState(0);

  const { customers } = useWallet();
  const { states } = useCustomerStates();

  const badges = useMemo(() => {
    let p = 0,
      e = 0,
      r = 0;
    for (const c of customers) {
      const st = states[customerKey(c)];
      if (isPromisePred(c, st)) p++;
      if (hasReqType(c, st, "exemption")) e++;
      if (hasReqType(c, st, "reschedule")) r++;
    }
    return { promises: p, exemptions: e, reschedules: r };
  }, [customers, states]);

  useEffect(() => {
    if (!employeeId) return setMailUnread(0);
    const refresh = () => {
      const all = readMessages();
      setMailUnread(all.filter((m) => m.toEmployeeId === employeeId && !m.read).length);
    };
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [employeeId, open]);

  return (
    <>
      <CollectorDashboard
        collected={collected}
        totalAccounts={totalAccounts}
        totalBalance={totalBalance}
        filteredAccounts={filteredAccounts}
        filteredBalance={filteredBalance}
        filteredPF={filteredPF}
        filteredAL={filteredAL}
        filteredCC={filteredCC}
        filteredSalary={filteredSalary}
        filteredDeceased={filteredDeceased}
        filteredSibel={filteredSibel}
        mailUnread={mailUnread}
        badges={badges}
        groupEnabled={groupEnabled}
        onSelectAction={(k) => {
          if (k === "group" && !groupEnabled) {
            toast.error("لم تتم إضافتك إلى القروب بعد. يرجى مراجعة الإدارة.");
            return;
          }
          if (k === "mail") {
            navigate({ to: "/mail" });
            return;
          }
          if (k === "wallet") {
            navigate({ to: "/wallet-view", search: { view: "my-wallet" } });
            return;
          }
          if (
            k === "salary" ||
            k === "deceased" ||
            k === "sibel" ||
            k === "promises" ||
            k === "exemptions" ||
            k === "reschedules"
          ) {
            navigate({ to: "/wallet-view", search: { view: k } });
            return;
          }
          if (["cc", "al", "pf"].includes(k)) {
            setWalletFilter(k);
            setOpen("wallet");
            return;
          }
          setOpen(k);
        }}
      />

      <PromisesDialog open={open === "promises"} onClose={() => setOpen(null)} />
      <RequestsDialog open={open === "exemptions"} onClose={() => setOpen(null)} kind="exemption" />
      <RequestsDialog
        open={open === "reschedules"}
        onClose={() => setOpen(null)}
        kind="reschedule"
      />
      <FullWalletDialog
        open={open === "wallet"}
        onClose={() => setOpen(null)}
        filterType={walletFilter}
      />
      <GroupDialog open={open === "group"} onClose={() => setOpen(null)} />
    </>
  );
}

/* ---------- Customer-list dialogs ---------- */

function useFilteredCustomers(predicate: (c: Customer, st: any) => boolean): Customer[] {
  const { customers } = useWallet();
  const { states } = useCustomerStates();
  return useMemo(
    () => customers.filter((c) => predicate(c, states[customerKey(c)])),
    [customers, states, predicate],
  );
}

function CustomersList({ items, emptyText }: { items: Customer[]; emptyText: string }) {
  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground px-1">
        إجمالي: <span className="tabular-nums font-bold text-foreground">{items.length}</span>
      </div>
      {items.map((c) => (
        <Card key={customerKey(c)} className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{c["اسم العميل"] || "بدون اسم"}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                هوية: <span className="tabular-nums">{c["رقم الهوية"] || "—"}</span> · حساب:{" "}
                <span className="tabular-nums">{c["رقم الحساب"] || "—"}</span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {c["المنتج"] || "—"} · {c["عمر الدين"] || "—"}
              </div>
            </div>
            <div className="text-left shrink-0">
              <div className="text-sm font-bold text-primary tabular-nums">
                {formatCurrency(c["المبلغ"])}
              </div>
              <div className="text-[10px] text-muted-foreground">SAR</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PromisesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useFilteredCustomers(isPromisePred);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-md max-h-[85vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-right">وعود السداد ({items.length})</DialogTitle>
        </DialogHeader>
        <CustomersList items={items} emptyText="لا توجد وعود سداد مسجلة" />
      </DialogContent>
    </Dialog>
  );
}

function RequestsDialog({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: "exemption" | "reschedule";
}) {
  const items = useFilteredCustomers((c, st) => hasReqType(c, st, kind));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-md max-h-[85vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-right">
            {kind === "exemption" ? "طلبات الإعفاء" : "طلبات الجدولة"} ({items.length})
          </DialogTitle>
        </DialogHeader>
        <CustomersList
          items={items}
          emptyText={kind === "exemption" ? "لا توجد طلبات إعفاء" : "لا توجد طلبات جدولة"}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Full wallet table ---------- */

const ACTION_OPTIONS: { value: string; color: string }[] = [
  { value: "بيانات خاطئة", color: "#6B7280" },
  { value: "بدون إجابة", color: "#94A3B8" },
  { value: "Call Back", color: "#3B82F6" },
  { value: "الرقم خطأ", color: "#F97316" },
  { value: "تم السداد", color: "#22C55E" },
  { value: "خروج نهائي", color: "#0EA5A4" },
  { value: "متوفي", color: "#EF4444" },
  { value: "مشكلة غير محلولة", color: "#DC2626" },
  { value: "وعد سداد", color: "#8B5CF6" },
];

const YES_NO_OPTIONS = ["Yes", "No"] as const;

function FullWalletDialog({
  open,
  onClose,
  filterType = null,
}: {
  open: boolean;
  onClose: () => void;
  filterType?: QuickKey | null;
}) {
  const { customers } = useWallet();
  const { states, update } = useCustomerStates();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [colFilters, setColFilters] = useState<
    Record<string, { search: string; excluded: string[] }>
  >({});
  const [sortCol, setSortCol] = useState<{ h: string; dir: "asc" | "desc" } | null>(null);

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

  const nonEmpty = (v: any) => v != null && String(v).trim() !== "";

  const baseCustomers = useMemo(() => {
    if (!filterType) return customers;
    return customers.filter((c) => {
      const k = customerKey(c);
      const st = states[k];
      switch (filterType) {
        case "cc": {
          const p = String(c["نوع المنتج"] ?? c["المنتج"] ?? "").toUpperCase();
          return p.includes("CC");
        }
        case "al": {
          const p = String(c["نوع المنتج"] ?? c["المنتج"] ?? "").toUpperCase();
          return p.includes("AL");
        }
        case "pf": {
          const p = String(c["نوع المنتج"] ?? c["المنتج"] ?? "").toUpperCase();
          return p.includes("PF");
        }
        case "salary": {
          return isYes(c["عميل رواتب"]);
        }
        case "deceased": {
          return isYes(c["عميل متوفي"]);
        }
        case "sibel": {
          return (
            nonEmpty(c["رقم طلب سبيل"]) ||
            nonEmpty(c["رقم طلب سيبل"]) ||
            nonEmpty(c["رقم الطلب في نظام سيبل"]) ||
            nonEmpty(c["نوع الطلب"]) ||
            nonEmpty(c["طلب الطلب"]) ||
            nonEmpty(c["طلب اعفاء"]) ||
            nonEmpty(c["طلب جدولة"]) ||
            nonEmpty(c["رقم الطلب"])
          );
        }
        case "promises": {
          return isPromisePred(c, st);
        }
        case "exemptions": {
          return hasReqType(c, st, "exemption");
        }
        case "reschedules": {
          return hasReqType(c, st, "reschedule");
        }
        default:
          return true;
      }
    });
  }, [customers, filterType, states]);

  const cols: { h: string; k: keyof Customer | string[] }[] = [
    { h: "رقم الحساب", k: "رقم الحساب" },
    { h: "مبلغ المديونية", k: "مبلغ المديونية" },
    { h: "NOTE", k: ["NOTE", "Note"] as any },
    { h: "الاكشن", k: "الاكشن" },
    { h: "نوع المنتج", k: ["نوع المنتج", "المنتج"] as any },
    { h: "رقم الهوية", k: "رقم الهوية" },
    { h: "اسم العميل", k: "اسم العميل" },
    { h: "رقم الجوال", k: "رقم الجوال" },
    { h: "JWO_DT", k: ["jWO_DT", "jWO-DT"] as any },
    { h: "عمر الدين", k: ["عمر الدين", "عدد ايام التعثر"] as any },
    { h: "تاريخ التجميد", k: "تاريخ التجميد" },
    { h: "عميل متوفي", k: "عميل متوفي" },
    { h: "عميل رواتب", k: "عميل رواتب" },
    { h: "تقييم الأعمال", k: ["تقييم أعمال", "تقييم الأعمال"] as any },
    { h: "سند غير مؤرشف", k: "سند غير مؤرشف" as any },
    { h: "رقم القضية", k: "رقم القضية" },
    { h: "اسم المحكمة", k: "اسم المحكمة" },
    { h: "رقم مرجع الحجز التنفيذي", k: ["رقم مرجع الحجز التنفيذي", "مرجع الحجز التنفيذي"] as any },
    { h: "أرصدة محجوزة", k: ["أرصدة محجوزة", "ارصدة محجوزه", "ارصده محجوزه"] as any },
    { h: "السداد", k: "السداد" as any },
    { h: "رقم طلب سيبل", k: ["رقم طلب سيبل", "رقم طلب سبيل", "رقم الطلب في نظام سيبل"] as any },
    { h: "نوع الطلب", k: "نوع الطلب" as any },
    { h: "الوصف", k: "الوصف" as any },
  ];

  const readRaw = (row: Customer, k: string | string[]) => {
    const keys = Array.isArray(k) ? k : [k];
    for (const key of keys) {
      const v = (row as any)[key];
      if (v != null && v !== "") return v;
    }
    return null;
  };

  const readEdited = (row: Customer, st: any, k: string | string[]) => {
    const keys = Array.isArray(k) ? k : [k];
    // تاريخ التجميد is computed; ignore raw / edits and derive from JWO_DT.
    if (keys.includes("تاريخ التجميد")) {
      return freezeFromJwo(readJwo(row)) || null;
    }
    const edits = st?.edits || {};
    for (const key of keys) {
      if (edits[key] != null && edits[key] !== "") return edits[key];
    }
    return readRaw(row, k);
  };

  const patchEdit = (row: Customer, field: string, value: any) => {
    const key = customerKey(row);
    if (!key) return;
    const st = states[key];
    update(key, { edits: { ...(st?.edits || {}), [field]: value } });
  };

  const yesNoValue = (v: any): "Yes" | "No" | "" => {
    if (v == null || v === "") return "";
    const s = String(v).trim().toLowerCase();
    if (["yes", "y", "true", "1", "نعم"].includes(s)) return "Yes";
    if (["no", "n", "false", "0", "لا"].includes(s)) return "No";
    return s.includes("نعم") ? "Yes" : s.includes("لا") ? "No" : "";
  };

  const intlPhone = (v: any): string => {
    if (v == null || v === "") return "";
    let s = String(v).replace(/\D/g, "");
    if (!s) return "";
    if (s.startsWith("00")) s = s.slice(2);
    if (s.startsWith("05") && s.length === 10) s = "966" + s.slice(1);
    else if (s.startsWith("5") && s.length === 9) s = "966" + s;
    else if (!s.startsWith("966")) {
      if (s.length === 9 && s.startsWith("5")) s = "966" + s;
    }
    return "+" + s;
  };

  const getColString = (row: Customer, col: { h: string; k: any }) => {
    const st = states[customerKey(row)];
    const v = readEdited(row, st, col.k);
    if (v == null) return "";
    return String(v);
  };

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = baseCustomers;
    if (q) {
      list = list.filter((row) => {
        const name = String(row["اسم العميل"] || "").toLowerCase();
        const id = String(row["رقم الهوية"] || "").toLowerCase();
        const account = String(row["رقم الحساب"] || "").toLowerCase();
        const phone = String(row["رقم الجوال"] || "").toLowerCase();
        return name.includes(q) || id.includes(q) || account.includes(q) || phone.includes(q);
      });
    }
    // Per-column filters
    const activeCols = cols.filter((c) => {
      const f = colFilters[c.h];
      return f && ((f.search && f.search.trim() !== "") || (f.excluded && f.excluded.length > 0));
    });
    if (activeCols.length > 0) {
      list = list.filter((row) =>
        activeCols.every((c) => {
          const cell = getColString(row, c);
          const f = colFilters[c.h];
          if (f.search && f.search.trim() !== "") {
            if (!cell.toLowerCase().includes(f.search.trim().toLowerCase())) return false;
          }
          if (f.excluded && f.excluded.length > 0) {
            if (f.excluded.includes(cell)) return false;
          }
          return true;
        }),
      );
    }
    if (sortCol) {
      const col = cols.find((c) => c.h === sortCol.h);
      if (col) {
        const dir = sortCol.dir === "asc" ? 1 : -1;
        list = [...list].sort((a, b) => {
          const av = getColString(a, col);
          const bv = getColString(b, col);
          const an = Number(av.replace(/[,\s]/g, ""));
          const bn = Number(bv.replace(/[,\s]/g, ""));
          if (!isNaN(an) && !isNaN(bn) && av !== "" && bv !== "") return (an - bn) * dir;
          return av.localeCompare(bv, "ar") * dir;
        });
      }
    }
    return list;
  }, [baseCustomers, searchQuery, colFilters, sortCol, states]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const currentPageSafe = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedList = useMemo(() => {
    const start = (currentPageSafe - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPageSafe, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery, pageSize]);

  const cellCls =
    "border px-1 py-0 whitespace-nowrap tabular-nums align-middle text-center text-[10px] leading-tight";

  const filterLabels: Record<string, string> = {
    promises: "وعود السداد",
    exemptions: "طلبات الإعفاء",
    reschedules: "طلبات الجدولة",
    cc: "بطاقات الائتمان CC",
    al: "القروض التأجيرية AL",
    pf: "القروض الشخصية PF",
    salary: "عملاء رواتب",
    deceased: "عملاء متوفين",
    sibel: "عملاء لديهم طلبات سابقة",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden p-0"
        dir="rtl"
      >
        <DialogHeader className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-right flex items-center gap-2 font-black font-sans">
              <span>{filterType ? filterLabels[filterType] || "المحفظة" : "محفظتي"}</span>
              <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                {filteredList.length} عميل {filterType ? "مصفى" : ""}
              </span>
            </DialogTitle>
          </div>
          <div
            className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between"
            dir="rtl"
          >
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="البحث بالاسم، الهوية، رقم الحساب أو الجوال..."
                value={searchQuery}
                onChange={(ev) => setSearchQuery(ev.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-emerald-500 font-sans"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>عرض:</span>
                <select
                  value={pageSize}
                  onChange={(ev) => setPageSize(Number(ev.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none"
                >
                  <option value={30}>30 عميل</option>
                  <option value={50}>50 عميل</option>
                  <option value={100}>100 عميل</option>
                  <option value={200}>200 عميل</option>
                </select>
              </div>

              <div className="h-4 w-px bg-border mx-2" />

              <div className="flex items-center gap-1.5" dir="rtl">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPageSafe <= 1}
                  className="h-8 px-2 text-xs"
                >
                  السابق
                </Button>
                <span>
                  الصفحة {currentPageSafe} من {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPageSafe >= totalPages}
                  className="h-8 px-2 text-xs"
                >
                  التالي
                </Button>
              </div>

              <div className="h-4 w-px bg-border mx-1" />
              <span>(المطابق: {filteredList.length})</span>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-auto max-h-[65vh]" dir="ltr">
          <table className="w-full text-[10px] border-collapse" dir="ltr">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="border px-1 py-1 text-center font-bold">#</th>
                {cols.map((c) => {
                  const f = colFilters[c.h];
                  const isActive =
                    (f &&
                      ((f.search && f.search.trim() !== "") ||
                        (f.excluded && f.excluded.length > 0))) ||
                    sortCol?.h === c.h;
                  return (
                    <th
                      key={c.h}
                      className="border px-1 py-1 text-center font-bold whitespace-nowrap"
                    >
                      <div className="inline-flex items-center gap-1">
                        <span>{c.h}</span>
                        <ColumnFilter
                          col={c}
                          baseList={baseCustomers}
                          getColString={getColString}
                          filter={f}
                          sort={sortCol?.h === c.h ? sortCol.dir : null}
                          isActive={!!isActive}
                          onChange={(next) =>
                            setColFilters((prev) => {
                              const np = { ...prev };
                              if (
                                !next ||
                                (!next.search && (!next.excluded || next.excluded.length === 0))
                              ) {
                                delete np[c.h];
                              } else {
                                np[c.h] = next;
                              }
                              return np;
                            })
                          }
                          onSort={(dir) => setSortCol(dir ? { h: c.h, dir } : null)}
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((row, index) => {
                const globalIndex = (currentPageSafe - 1) * pageSize + index;
                const st = states[customerKey(row)];
                return (
                  <tr
                    key={customerKey(row) || globalIndex}
                    className="odd:bg-background even:bg-muted/30 hover:bg-accent/40"
                  >
                    <td className={cellCls + " text-muted-foreground"}>{globalIndex + 1}</td>
                    {cols.map((c) => {
                      const v = readEdited(row, st, c.k as any);
                      const display = v == null ? "" : String(v);

                      // ---- Editable: الاكشن (dropdown) ----
                      if (c.h === "الاكشن") {
                        const cur = ACTION_OPTIONS.find((o) => o.value === display);
                        return (
                          <td key={c.h} className={cellCls}>
                            <Select
                              value={display || undefined}
                              onValueChange={(val) => patchEdit(row, "الاكشن", val)}
                            >
                              <SelectTrigger
                                className="h-5 min-w-[100px] text-[10px] px-1 mx-auto justify-end text-right flex-row-reverse"
                                style={
                                  cur
                                    ? {
                                        color: cur.color,
                                        borderColor: cur.color,
                                        backgroundColor: `${cur.color}15`,
                                      }
                                    : undefined
                                }
                              >
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent dir="rtl" align="start" className="min-w-[140px]">
                                {ACTION_OPTIONS.map((o) => (
                                  <SelectItem
                                    key={o.value}
                                    value={o.value}
                                    className="text-[12px] flex justify-end text-right w-full font-bold cursor-pointer"
                                    style={{ color: o.color }}
                                  >
                                    <span className="flex items-center gap-2 w-full justify-end text-right">
                                      <span>{o.value}</span>
                                      <span
                                        className="inline-block w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: o.color }}
                                      />
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        );
                      }

                      // ---- Read-only: تاريخ التجميد (محسوب من JWO_DT − 3 أشهر) ----
                      if (c.h === "تاريخ التجميد") {
                        const dateVal = display ? String(display).slice(0, 10) : "";
                        return (
                          <td
                            key={c.h}
                            className={cellCls}
                            title="محسوب تلقائياً من JWO_DT − 3 أشهر"
                          >
                            {dateVal}
                          </td>
                        );
                      }

                      // ---- Editable: Yes/No fields ----
                      if (
                        c.h === "عميل متوفي" ||
                        c.h === "عميل رواتب" ||
                        c.h === "تقييم الأعمال" ||
                        c.h === "سند غير مؤرشف"
                      ) {
                        const yn = yesNoValue(v);
                        return (
                          <td key={c.h} className={cellCls}>
                            <Select
                              value={yn || undefined}
                              onValueChange={(val) => patchEdit(row, c.h, val)}
                            >
                              <SelectTrigger className="h-6 min-w-[60px] text-[10px] px-1 mx-auto justify-end text-right flex-row-reverse">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {YES_NO_OPTIONS.map((o) => (
                                  <SelectItem
                                    key={o}
                                    value={o}
                                    className="text-[11px] text-right justify-end font-medium"
                                  >
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        );
                      }

                      // ---- Editable: رقم القضية (digits only) ----
                      if (c.h === "رقم القضية") {
                        return (
                          <td key={c.h} className={cellCls}>
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={display}
                              onChange={(ev) => {
                                const onlyDigits = ev.target.value.replace(/\D/g, "");
                                patchEdit(row, "رقم القضية", onlyDigits || null);
                              }}
                              className="h-6 text-[10px] px-1 min-w-[90px] mx-auto"
                            />
                          </td>
                        );
                      }

                      // ---- Phone: international format ----
                      if (c.h === "رقم الجوال") {
                        return (
                          <td key={c.h} className={cellCls}>
                            {intlPhone(v)}
                          </td>
                        );
                      }

                      // ---- Currency (right-aligned only column) ----
                      if (c.h === "مبلغ المديونية" || c.h === "أرصدة محجوزة" || c.h === "السداد") {
                        return (
                          <td key={c.h} className={cellCls.replace("text-center", "text-right")}>
                            {v == null ? "" : formatCurrency(v as number)}
                          </td>
                        );
                      }

                      // ---- Clickable: opens customer page ----
                      if (c.h === "رقم الحساب" || c.h === "رقم الهوية" || c.h === "اسم العميل") {
                        const k = customerKey(row);
                        return (
                          <td key={c.h} className={cellCls}>
                            {display ? (
                              <button
                                type="button"
                                className="text-primary underline-offset-2 hover:underline"
                                onClick={() => {
                                  if (!k) return;
                                  window.dispatchEvent(
                                    new CustomEvent("open-customer", { detail: k }),
                                  );
                                  onClose();
                                }}
                              >
                                {display}
                              </button>
                            ) : (
                              ""
                            )}
                          </td>
                        );
                      }

                      // ---- Default: plain display, empty when null ----
                      return (
                        <td key={c.h} className={cellCls}>
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ColFilterState = { search: string; excluded: string[] };

function ColumnFilter({
  col,
  baseList,
  getColString,
  filter,
  sort,
  isActive,
  onChange,
  onSort,
}: {
  col: { h: string; k: any };
  baseList: Customer[];
  getColString: (row: Customer, col: { h: string; k: any }) => string;
  filter?: ColFilterState;
  sort: "asc" | "desc" | null;
  isActive: boolean;
  onChange: (next: ColFilterState | null) => void;
  onSort: (dir: "asc" | "desc" | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(filter?.search || "");
  const excluded = filter?.excluded || [];

  const uniqueValues = useMemo(() => {
    const set = new Set<string>();
    baseList.forEach((r) => set.add(getColString(r, col)));
    return Array.from(set).sort((a, b) => {
      if (a === "") return 1;
      if (b === "") return -1;
      return a.localeCompare(b, "ar");
    });
  }, [baseList, col, getColString]);

  const visibleValues = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return uniqueValues;
    return uniqueValues.filter((v) => v.toLowerCase().includes(q));
  }, [uniqueValues, localSearch]);

  const toggleVal = (v: string) => {
    const ex = new Set(excluded);
    if (ex.has(v)) ex.delete(v);
    else ex.add(v);
    const arr = Array.from(ex);
    onChange({ search: filter?.search || "", excluded: arr });
  };

  const allVisibleChecked = visibleValues.every((v) => !excluded.includes(v));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="فلتر"
          className={`inline-flex items-center justify-center size-4 rounded-sm border ${
            isActive
              ? "bg-emerald-500 border-emerald-600 text-white"
              : "bg-white border-neutral-300 text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          <ChevronDown className="size-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2" dir="rtl">
        <div className="flex items-center justify-between gap-1 mb-2">
          <button
            type="button"
            onClick={() => onSort(sort === "asc" ? null : "asc")}
            className={`flex-1 inline-flex items-center justify-center gap-1 h-7 rounded border text-[11px] ${
              sort === "asc"
                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                : "bg-white hover:bg-neutral-50"
            }`}
          >
            <ArrowUp className="size-3" /> تصاعدي
          </button>
          <button
            type="button"
            onClick={() => onSort(sort === "desc" ? null : "desc")}
            className={`flex-1 inline-flex items-center justify-center gap-1 h-7 rounded border text-[11px] ${
              sort === "desc"
                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                : "bg-white hover:bg-neutral-50"
            }`}
          >
            <ArrowDown className="size-3" /> تنازلي
          </button>
        </div>
        <input
          type="text"
          placeholder="بحث..."
          value={localSearch}
          onChange={(e) => {
            setLocalSearch(e.target.value);
            onChange({ search: e.target.value, excluded });
          }}
          className="w-full h-7 rounded border border-input bg-background px-2 text-[11px] mb-2"
        />
        <div className="flex items-center justify-between mb-1 px-1">
          <label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={allVisibleChecked}
              onChange={() => {
                if (allVisibleChecked) {
                  // exclude all visible
                  const ex = new Set(excluded);
                  visibleValues.forEach((v) => ex.add(v));
                  onChange({ search: filter?.search || "", excluded: Array.from(ex) });
                } else {
                  // include all visible (remove from excluded)
                  const ex = new Set(excluded);
                  visibleValues.forEach((v) => ex.delete(v));
                  onChange({ search: filter?.search || "", excluded: Array.from(ex) });
                }
              }}
            />
            (تحديد الكل)
          </label>
          <button
            type="button"
            onClick={() => {
              setLocalSearch("");
              onChange(null);
              onSort(null);
              setOpen(false);
            }}
            className="text-[10px] text-rose-600 hover:underline"
          >
            مسح الفلتر
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto border rounded p-1 space-y-0.5">
          {visibleValues.length === 0 && (
            <div className="text-[11px] text-muted-foreground text-center py-2">لا توجد قيم</div>
          )}
          {visibleValues.map((v) => (
            <label
              key={v}
              className="flex items-center gap-1.5 text-[11px] px-1 py-0.5 hover:bg-neutral-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!excluded.includes(v)}
                onChange={() => toggleVal(v)}
              />
              <span className="truncate">{v === "" ? "(فارغ)" : v}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Mail dialog ---------- */

export function MailPage() {
  const session = getSession();
  const me = session?.employeeId || "";
  const myName = session?.name || me;
  const [tab, setTab] = useState<"compose" | "inbox" | "sent">("compose");
  const [messages, setMessages] = useState<Message[]>([]);
  const [openMsg, setOpenMsg] = useState<Message | null>(null);

  const refresh = () => setMessages(readMessages());
  useEffect(() => {
    refresh();
  }, []);

  const inbox = messages.filter((m) => m.toEmployeeId === me);
  const sent = messages.filter((m) => m.fromEmployeeId === me);

  const markRead = (id: string) => {
    const all = readMessages().map((m) => (m.id === id ? { ...m, read: true } : m));
    writeMessages(all);
    setMessages(all);
  };

  const remove = (id: string) => {
    const all = readMessages().filter((m) => m.id !== id);
    writeMessages(all);
    setMessages(all);
    if (openMsg?.id === id) setOpenMsg(null);
  };

  return (
    <div dir="rtl" className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="compose">
            <Plus className="size-3 ml-1" /> رسالة جديدة
          </TabsTrigger>
          <TabsTrigger value="inbox">
            <Inbox className="size-3 ml-1" /> الوارد
            {inbox.filter((m) => !m.read).length > 0 && (
              <Badge className="mr-1 h-4 px-1 text-[10px]" variant="destructive">
                {inbox.filter((m) => !m.read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="size-3 ml-1" /> المرسل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <Compose
            fromEmployeeId={me}
            fromName={myName}
            onSent={() => {
              refresh();
              setTab("sent");
              toast.success("تم إرسال الرسالة");
            }}
          />
        </TabsContent>

        <TabsContent value="inbox" className="mt-4">
          <MessageList
            items={inbox}
            showFrom
            onOpen={(m) => {
              if (!m.read) markRead(m.id);
              setOpenMsg(m);
            }}
            onDelete={remove}
          />
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <MessageList items={sent} onOpen={setOpenMsg} onDelete={remove} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!openMsg} onOpenChange={(o) => !o && setOpenMsg(null)}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {openMsg?.fromName} → {openMsg?.toName}
            </DialogTitle>
          </DialogHeader>
          {openMsg && (
            <div className="space-y-3 text-sm">
              <div className="text-[11px] text-muted-foreground">
                {new Date(openMsg.createdAt).toLocaleString("en-US")}
              </div>
              {openMsg.body && (
                <div className="rounded-md bg-muted/40 p-3 whitespace-pre-wrap">{openMsg.body}</div>
              )}
              <AttachmentsView attachments={openMsg.attachments} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageList({
  items,
  showFrom,
  onOpen,
  onDelete,
}: {
  items: Message[];
  showFrom?: boolean;
  onOpen: (m: Message) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0)
    return <div className="py-8 text-center text-sm text-muted-foreground">لا توجد رسائل</div>;
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <Card
          key={m.id}
          className={`p-3 ${!m.read && showFrom ? "border-primary/60 bg-primary/5" : ""}`}
        >
          <button onClick={() => onOpen(m)} className="w-full text-right">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-sm flex-1 truncate">
                {showFrom ? m.fromName : `إلى: ${m.toName}`}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(m.createdAt).toLocaleDateString("en-US")}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate mt-1">
              {m.body || (m.attachments.length > 0 ? `📎 ${m.attachments.length} مرفق` : "—")}
            </div>
          </button>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(m.id)}
              className="h-7 text-destructive"
            >
              <Trash2 className="size-3 ml-1" /> حذف
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Compose({
  fromEmployeeId,
  fromName,
  onSent,
}: {
  fromEmployeeId: string;
  fromName: string;
  onSent: () => void;
}) {
  const collectors = useMemo(
    () => getAllCollectors().filter((c) => c.employeeId !== fromEmployeeId),
    [fromEmployeeId],
  );
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [atts, setAtts] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fileToAttachment = (file: File, kind: Attachment["kind"]): Promise<Attachment> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () =>
        resolve({ name: file.name, type: file.type, kind, dataUrl: String(r.result) });
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const handleFiles = async (files: FileList | null, kind: Attachment["kind"]) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: الحد الأقصى 5MB`);
        continue;
      }
      next.push(await fileToAttachment(f, kind));
    }
    setAtts((a) => [...a, ...next]);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        const att = await fileToAttachment(file, "audio");
        setAtts((a) => [...a, att]);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast.error("تعذر الوصول إلى الميكروفون");
    }
  };
  const stopRec = () => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  };

  const send = () => {
    if (!to) return toast.error("اختر المستلم");
    if (!body.trim() && atts.length === 0) return toast.error("أدخل نصاً أو أرفق ملفاً");
    const recipient = collectors.find((c) => c.employeeId === to);
    addMessage({
      id: `M${Date.now()}`,
      fromEmployeeId,
      fromName,
      toEmployeeId: to,
      toName: recipient?.collector || to,
      body: body.trim(),
      attachments: atts,
      createdAt: new Date().toISOString(),
      read: false,
    });
    setTo("");
    setBody("");
    setAtts([]);
    onSent();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium">المستلم</label>
        <Select value={to} onValueChange={setTo}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="اختر اسم المستلم" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {collectors.map((c) => (
              <SelectItem key={c.employeeId} value={c.employeeId}>
                {c.collector}{" "}
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  ({c.employeeId})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">الرسالة</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="اكتب رسالتك…"
          rows={4}
        />
      </div>

      {atts.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium">المرفقات ({atts.length})</div>
          <div className="space-y-1.5">
            {atts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs rounded-md border p-2">
                {a.kind === "image" ? (
                  <ImageIcon className="size-4" />
                ) : a.kind === "audio" ? (
                  <Mic className="size-4" />
                ) : (
                  <Paperclip className="size-4" />
                )}
                <span className="flex-1 truncate">{a.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => setAtts((arr) => arr.filter((_, j) => j !== i))}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files, "image");
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files, "file");
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()}>
          <ImageIcon className="size-4 ml-1" /> صورة
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip className="size-4 ml-1" /> ملف
        </Button>
        {!recording ? (
          <Button type="button" variant="outline" size="sm" onClick={startRec}>
            <Mic className="size-4 ml-1" /> تسجيل صوتي
          </Button>
        ) : (
          <Button type="button" variant="destructive" size="sm" onClick={stopRec}>
            <StopCircle className="size-4 ml-1" /> إيقاف التسجيل
          </Button>
        )}
      </div>

      <Button onClick={send} className="w-full">
        <Send className="size-4 ml-1" /> إرسال
      </Button>
    </div>
  );
}

function AttachmentsView({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium">المرفقات</div>
      {attachments.map((a, i) => (
        <div key={i} className="rounded-md border p-2 space-y-1">
          <div className="text-[11px] text-muted-foreground truncate">{a.name}</div>
          {a.kind === "image" && (
            <img src={a.dataUrl} alt={a.name} className="max-h-64 rounded mx-auto" />
          )}
          {a.kind === "audio" && <audio controls src={a.dataUrl} className="w-full" />}
          {a.kind === "file" && (
            <a
              href={a.dataUrl}
              download={a.name}
              className="text-xs text-primary underline inline-flex items-center gap-1"
            >
              <Paperclip className="size-3" /> تحميل الملف
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Group dialog ---------- */

function GroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = getSession();
  const me = session?.employeeId || "";
  const myName = session?.name || me;
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const all = readMessages().filter((m) => m.toEmployeeId === "GROUP");
    // Oldest first for WhatsApp-like flow
    setMessages([...all].reverse());
    fetchGroupMembers()
      .then(setMemberIds)
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, 30);
    return () => clearTimeout(t);
  }, [messages.length, open]);

  const collectors = useMemo(() => getAllCollectors(), [open]);
  const members = useMemo(
    () => collectors.filter((c) => memberIds.includes(c.employeeId)),
    [collectors, memberIds],
  );

  const sendMessage = (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;
    const m: Message = {
      id: `G${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      fromEmployeeId: me,
      fromName: myName,
      toEmployeeId: "GROUP",
      toName: "القروب",
      body: text.trim(),
      attachments,
      createdAt: new Date().toISOString(),
    };
    addMessage(m);
    setMessages((arr) => [...arr, m]);
    setBody("");
  };

  const handleFile = async (file: File, kind: "image" | "file") => {
    const reader = new FileReader();
    reader.onload = () => {
      const att: Attachment = {
        name: file.name,
        type: file.type,
        kind,
        dataUrl: String(reader.result || ""),
      };
      sendMessage("", [att]);
    };
    reader.readAsDataURL(file);
  };

  // Aggregations for info panel
  const mediaItems = useMemo(
    () =>
      messages.flatMap((m) =>
        m.attachments.filter((a) => a.kind === "image").map((a) => ({ a, m })),
      ),
    [messages],
  );
  const docItems = useMemo(
    () =>
      messages.flatMap((m) =>
        m.attachments.filter((a) => a.kind === "file" || a.kind === "audio").map((a) => ({ a, m })),
      ),
    [messages],
  );
  const linkItems = useMemo(() => {
    const re = /(https?:\/\/[^\s]+)/gi;
    const out: { url: string; m: Message }[] = [];
    for (const m of messages) {
      const matches = m.body.match(re);
      if (matches) matches.forEach((url) => out.push({ url, m }));
    }
    return out;
  }, [messages]);

  const renderBody = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/[^\s]+)/gi);
    return parts.map((p, i) =>
      /^https?:\/\//i.test(p) ? (
        <a key={i} href={p} target="_blank" rel="noreferrer" className="underline break-all">
          {p}
        </a>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-0 gap-0 max-w-[480px] w-screen h-[100dvh] sm:h-[100dvh] rounded-none sm:rounded-none border-0 sm:max-w-[480px] overflow-hidden flex flex-col"
        dir="rtl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>قروب المحصلين</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <button
          onClick={() => setInfoOpen(true)}
          className="flex items-center gap-3 px-3 py-3 bg-[#075E54] text-white shrink-0 text-right"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 -ml-1 rounded hover:bg-white/10"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
          <div className="size-10 rounded-full shrink-0 bg-[#075E54] flex items-center justify-center relative overflow-hidden text-white font-bold text-[13px] border border-white/10 select-none">
            <span>SC</span>
            <img
              src={groupAvatar.url}
              alt="Smart collection"
              className="absolute inset-0 size-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">Smart collection</div>
            <div className="text-[11px] opacity-80 truncate">
              {memberIds.length} عضو · اضغط لعرض المعلومات
            </div>
          </div>
        </button>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
          style={{
            backgroundColor: "#ECE5DD",
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(0,0,0,0.03) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(0,0,0,0.03) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {messages.length === 0 && (
            <div className="py-10 text-center text-sm text-neutral-600">
              لا توجد رسائل في القروب
            </div>
          )}
          {messages.map((m) => {
            const mine = m.fromEmployeeId === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[78%] rounded-lg px-3 py-2 shadow-sm text-sm ${
                    mine ? "bg-[#DCF8C6]" : "bg-white"
                  }`}
                >
                  {!mine && (
                    <div className="text-[11px] font-bold text-[#075E54] mb-0.5">{m.fromName}</div>
                  )}
                  {m.attachments.map((a, i) => (
                    <div key={i} className="mb-1">
                      {a.kind === "image" && (
                        <img src={a.dataUrl} alt={a.name} className="rounded max-h-64" />
                      )}
                      {a.kind === "audio" && <audio controls src={a.dataUrl} className="w-full" />}
                      {a.kind === "file" && (
                        <a
                          href={a.dataUrl}
                          download={a.name}
                          className="flex items-center gap-2 rounded bg-black/5 p-2 text-xs"
                        >
                          <Paperclip className="size-4" />
                          <span className="truncate">{a.name}</span>
                        </a>
                      )}
                    </div>
                  ))}
                  {m.body && (
                    <div className="whitespace-pre-wrap break-words">{renderBody(m.body)}</div>
                  )}
                  <div className="text-[10px] text-neutral-500 text-left mt-0.5">
                    {new Date(m.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="shrink-0 bg-[#F0F0F0] px-2 py-2 flex items-end gap-2">
          <input
            ref={imgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "image");
              e.target.value = "";
            }}
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "file");
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 text-neutral-600"
            onClick={() => imgRef.current?.click()}
            aria-label="صورة"
          >
            <ImageIcon className="size-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 text-neutral-600"
            onClick={() => fileRef.current?.click()}
            aria-label="ملف"
          >
            <Paperclip className="size-5" />
          </Button>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب رسالة…"
            rows={1}
            className="flex-1 bg-white rounded-2xl resize-none min-h-[40px] max-h-32 py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(body);
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            onClick={() => sendMessage(body)}
            className="shrink-0 bg-[#075E54] hover:bg-[#0a6b60] rounded-full"
            aria-label="إرسال"
          >
            <Send className="size-4" />
          </Button>
        </div>

        {/* Info panel */}
        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogContent
            className="p-0 gap-0 max-w-[480px] w-screen h-[100dvh] rounded-none border-0 overflow-hidden flex flex-col"
            dir="rtl"
          >
            <DialogHeader className="bg-[#075E54] text-white px-3 py-3 flex-row items-center gap-3 space-y-0">
              <button
                onClick={() => setInfoOpen(false)}
                className="p-1 rounded hover:bg-white/10"
                aria-label="رجوع"
              >
                <X className="size-5" />
              </button>
              <DialogTitle className="text-white text-base font-bold">معلومات القروب</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="bg-white border-b p-4 flex flex-col items-center gap-2">
                <div className="size-20 rounded-full bg-[#075E54] flex items-center justify-center relative overflow-hidden text-white font-bold text-2xl border border-neutral-200 select-none">
                  <span>SC</span>
                  <img
                    src={groupAvatar.url}
                    alt="Smart collection"
                    className="absolute inset-0 size-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div className="font-bold">Smart collection</div>
                <div className="text-xs text-muted-foreground">{memberIds.length} عضو</div>
              </div>
              <Tabs defaultValue="members" className="w-full">
                <TabsList className="grid grid-cols-4 w-full rounded-none bg-neutral-100 h-auto">
                  <TabsTrigger value="members" className="text-xs py-2">
                    الأعضاء
                  </TabsTrigger>
                  <TabsTrigger value="media" className="text-xs py-2">
                    الوسائط
                  </TabsTrigger>
                  <TabsTrigger value="docs" className="text-xs py-2">
                    المستندات
                  </TabsTrigger>
                  <TabsTrigger value="links" className="text-xs py-2">
                    الروابط
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="m-0">
                  {members.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      لا يوجد أعضاء بعد
                    </div>
                  ) : (
                    <ul className="divide-y bg-white">
                      {members.map((c) => (
                        <li key={c.employeeId} className="flex items-center gap-3 px-4 py-3">
                          <div className="size-10 rounded-full bg-[#128C7E] text-white grid place-items-center font-bold shrink-0">
                            {c.collector?.[0] || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{c.collector}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {c.employeeId} · {c.supervisor}
                            </div>
                          </div>
                          {c.employeeId === me && (
                            <Badge variant="secondary" className="text-[10px]">
                              أنت
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="media" className="m-0 p-2 bg-white">
                  {mediaItems.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      لا توجد وسائط
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {mediaItems.map(({ a }, i) => (
                        <a key={i} href={a.dataUrl} target="_blank" rel="noreferrer">
                          <img
                            src={a.dataUrl}
                            alt={a.name}
                            className="w-full aspect-square object-cover rounded"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="docs" className="m-0 bg-white">
                  {docItems.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      لا توجد مستندات
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {docItems.map(({ a, m }, i) => (
                        <li key={i} className="px-4 py-3 flex items-center gap-3">
                          <Paperclip className="size-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={a.dataUrl}
                              download={a.name}
                              className="text-sm font-medium truncate block"
                            >
                              {a.name}
                            </a>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {m.fromName} · {new Date(m.createdAt).toLocaleDateString("en-US")}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="links" className="m-0 bg-white">
                  {linkItems.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      لا توجد روابط
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {linkItems.map(({ url, m }, i) => (
                        <li key={i} className="px-4 py-3">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary underline break-all"
                          >
                            {url}
                          </a>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {m.fromName} · {new Date(m.createdAt).toLocaleDateString("en-US")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

// silence unused warning for writeMessages import (kept for future use)
void writeMessages;
