import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Filter, Search, Wallet, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWalletCustomers } from "@/lib/wallet.functions";
import { getSession } from "@/components/LoginGate";
import { customerKey, formatCurrency, formatPhone } from "@/lib/wallet-types";
import { useCustomerStates } from "@/lib/wallet-store";
import { freezeFromJwo, readJwo } from "@/lib/freeze-date";
import {
  isYesStrict,
  isFilled,
  isPromise,
  isExemptionRequest,
  isRescheduleRequest,
  normalizeReqType,
} from "@/lib/wallet-predicates";

const WALLET_VIEW_FILTERS = [
  "wallet",
  "my-wallet",
  "salary",
  "deceased",
  "sibel",
  "promises",
  "exemptions",
  "reschedules",
] as const;

type WalletViewFilter = (typeof WALLET_VIEW_FILTERS)[number];

const VIEW_LABELS: Record<WalletViewFilter, string> = {
  wallet: "المحفظة كاملة",
  "my-wallet": "محفظتي",
  salary: "عملاء رواتب",
  deceased: "عملاء متوفين",
  sibel: "عملاء لديهم طلبات سابقة",
  promises: "وعود السداد",
  exemptions: "طلبات الإعفاء",
  reschedules: "طلبات الجدولة",
};

export const Route = createFileRoute("/wallet-view")({
  validateSearch: (search: Record<string, unknown>): { view: WalletViewFilter } => {
    const view =
      typeof search.view === "string" &&
      WALLET_VIEW_FILTERS.includes(search.view as WalletViewFilter)
        ? (search.view as WalletViewFilter)
        : "wallet";

    return { view };
  },
  head: () => ({
    meta: [
      { title: "المحفظة كاملة" },
      { name: "description", content: "عرض المحفظة كاملة." },
    ],
  }),
  component: WalletViewPage,
});

type ColType = "currency" | "phone" | "yesno" | "editText" | "reqType" | "action";

const COLUMNS: { key: string; label: string; type?: ColType }[] = [
  { key: "رقم الحساب", label: "رقم الحساب" },
  { key: "مبلغ المديونية", label: "مبلغ المديونية", type: "currency" },
  { key: "NOTE", label: "NOTE" },
  { key: "الاكشن", label: "الاكشن", type: "action" },
  { key: "نوع المنتج", label: "نوع المنتج" },
  { key: "تاريخ التجميد", label: "تاريخ التجميد" },
  { key: "jWO_DT", label: "jWO_DT" },
  { key: "عمر الدين", label: "عمر الدين" },
  { key: "رقم الهوية", label: "رقم الهوية" },
  { key: "اسم العميل", label: "اسم العميل" },
  { key: "رقم الجوال", label: "رقم الجوال", type: "phone" },
  { key: "الرقم الوظيفي للمحصل", label: "الرقم الوظيفي للمحصل" },
  { key: "اسم المحصل", label: "اسم المحصل" },
  { key: "الرقم الوظيفي للمشرف", label: "الرقم الوظيفي للمشرف" },
  { key: "اسم المشرف", label: "اسم المشرف" },
  { key: "عميل متوفي", label: "عميل متوفي", type: "yesno" },
  { key: "عميل رواتب", label: "عميل رواتب", type: "yesno" },
  { key: "تقييم أعمال", label: "تقييم أعمال", type: "yesno" },
  { key: "سند غير مؤرشف", label: "سند غير مؤرشف", type: "yesno" },
  { key: "رقم القضية", label: "رقم القضية" },
  { key: "اسم المحكمة", label: "اسم المحكمة" },
  { key: "رقم مرجع الحجز التنفيذي", label: "رقم مرجع الحجز التنفيذي", type: "editText" },
  { key: "أرصدة محجوزة", label: "أرصدة محجوزة", type: "editText" },
  { key: "السداد", label: "السداد", type: "editText" },
  { key: "رقم طلب سبيل", label: "رقم طلب سيبل", type: "editText" },
  { key: "نوع الطلب", label: "نوع الطلب", type: "reqType" },
  { key: "الوصف", label: "الوصف" },
];

const MONEY_KEYS = new Set(["مبلغ المديونية", "أرصدة محجوزة", "السداد"]);
const DASH_RE = /^(\s|[-—–_]+)*$/;
const REQ_OPTIONS = ["إعفاء متوفين", "إعادة جدولة"] as const;

const ACTION_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "بيانات خاطئة", label: "بيانات خاطئة", color: "#6B7280" },
  { value: "بدون إجابة", label: "بدون إجابة", color: "#94A3B8" },
  { value: "Call Back", label: "Call Back", color: "#3B82F6" },
  { value: "الرقم خطأ", label: "الرقم خطأ", color: "#F97316" },
  { value: "تم السداد", label: "تم السداد", color: "#22C55E" },
  { value: "خروج نهائي", label: "خروج نهائي", color: "#0EA5A4" },
  { value: "متوفي", label: "متوفي", color: "#EF4444" },
  { value: "مشكلة غير محلولة", label: "مشكلة غير محلولة", color: "#DC2626" },
  { value: "وعد سداد", label: "وعد سداد", color: "#8B5CF6" },
];

function actionColor(v: string): string | undefined {
  return ACTION_OPTIONS.find((a) => a.value === v)?.color;
}

function actionStyle(v: string): React.CSSProperties | undefined {
  const c = actionColor(v);
  if (!c) return undefined;
  return { color: c, borderColor: c, backgroundColor: `${c}14` };
}

function isDashy(v: any) {
  if (v == null) return true;
  const s = String(v).trim();
  if (!s) return true;
  return DASH_RE.test(s);
}

function rawCellValue(row: any, key: string) {
  const src = row.raw && typeof row.raw === "object" ? row.raw : row;

  if (key === "تاريخ التجميد") {
    return freezeFromJwo(readJwo(src) ?? readJwo(row)) || null;
  }

  const dbMap: Record<string, string> = {
    "رقم الحساب": "account_number",
    "رقم الهوية": "national_id",
    "اسم العميل": "customer_name",
    "رقم الجوال": "phone",
    "مبلغ المديونية": "amount",
    "نوع المنتج": "product",
    "عمر الدين": "debt_age",
    "الاكشن": "action",
    "الرقم الوظيفي للمحصل": "agent_employee_id",
    "اسم المحصل": "agent_name",
    "الرقم الوظيفي للمشرف": "supervisor_employee_id",
    "اسم المشرف": "supervisor_name",
  };

  const fallback = dbMap[key] ? row[dbMap[key]] : undefined;

  if (key === "عميل رواتب") {
    if (row.is_salary === true) return "نعم";
    if (row.is_salary === false && (src[key] == null || src[key] === "")) return null;
  }

  if (key === "عميل متوفي") {
    if (row.is_deceased === true) return "نعم";
    if (row.is_deceased === false && (src[key] == null || src[key] === "")) return null;
  }

  return src[key] ?? row[key] ?? fallback ?? null;
}

function normYesNo(v: any): "Yes" | "No" {
  return isYesStrict(v) ? "Yes" : "No";
}

function hasReqType(row: any, st: any, kind: "exemption" | "reschedule") {
  const reqType = st?.edits?.["نوع الطلب"] ?? rawCellValue(row, "نوع الطلب");
  return kind === "exemption" ? isExemptionRequest(reqType) : isRescheduleRequest(reqType);
}

function rowKey(row: any) {
  const src = row.raw && typeof row.raw === "object" ? row.raw : row;
  return customerKey(src) || row.customer_key || "";
}

function effectiveValue(row: any, key: string, st: any, type?: ColType): string {
  const edit = st?.edits?.[key];
  let v: any;

  if (edit != null && edit !== "") v = edit;
  else v = rawCellValue(row, key);

  if (type === "yesno") return normYesNo(v);
  if (type === "reqType") return normalizeReqType(v);
  if (isDashy(v)) return "";

  return String(v);
}

function displayValue(row: any, key: string, st: any, type?: ColType): string {
  const v = effectiveValue(row, key, st, type);

  if (!v) return "";

  if (type === "currency") {
    const f = formatCurrency(v as any);
    return f === "—" ? "" : f;
  }

  if (type === "phone") {
    const f = formatPhone(v as any);
    return f === "—" ? "" : f;
  }

  return v;
}

function getCollectorEmployeeId(row: any): string {
  return String(rawCellValue(row, "الرقم الوظيفي للمحصل") ?? "").trim();
}

function getCollectorName(row: any): string {
  return String(rawCellValue(row, "اسم المحصل") ?? "").trim().toLowerCase();
}

function isCurrentCollectorRow(row: any, session: any): boolean {
  const sessionEmployeeId = String(session?.employeeId ?? "").trim();
  const sessionName = String(session?.name ?? "").trim().toLowerCase();

  const rowEmployeeId = getCollectorEmployeeId(row);
  const rowName = getCollectorName(row);

  if (sessionEmployeeId && rowEmployeeId && rowEmployeeId === sessionEmployeeId) return true;
  if (sessionName && rowName && rowName === sessionName) return true;

  return false;
}

function WalletViewPage() {
  const { view } = Route.useSearch();
  const readOnly = true;
  const loadFn = useServerFn(getWalletCustomers);
  const { states } = useCustomerStates();
  const update = (_k: string, _p: any) => {};

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    const session = getSession();

    if (!session) {
      setError("الرجاء تسجيل الدخول أولاً");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await loadFn({
          data: {
            role: session.role,
            employeeId: session.employeeId,
            forceAll: view === "wallet",
          },
        });

        setRows(data || []);
      } catch (e: any) {
        setError(e?.message || "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFn, view]);

  const viewRows = useMemo(() => {
    const session = getSession();
    if (!session) return [];

    const collectorRows = rows.filter((row) => isCurrentCollectorRow(row, session));

    if (view === "wallet") {
      return rows;
    }

    if (view === "my-wallet") {
      return collectorRows;
    }

    return collectorRows.filter((row) => {
      const st = states[rowKey(row)];

      switch (view) {
        case "salary":
          return isYesStrict(st?.edits?.["عميل رواتب"] ?? rawCellValue(row, "عميل رواتب"));

        case "deceased":
          return isYesStrict(st?.edits?.["عميل متوفي"] ?? rawCellValue(row, "عميل متوفي"));

        case "sibel":
          return (
            isFilled(st?.edits?.["رقم طلب سبيل"] ?? rawCellValue(row, "رقم طلب سبيل")) ||
            isFilled(rawCellValue(row, "رقم طلب سيبل"))
          );

        case "promises":
          return isPromise(st?.edits?.["الاكشن"] ?? rawCellValue(row, "الاكشن"));

        case "exemptions":
          return hasReqType(row, st, "exemption");

        case "reschedules":
          return hasReqType(row, st, "reschedule");

        default:
          return true;
      }
    });
  }, [rows, states, view]);

  const activeColumns = COLUMNS;

  const colFiltered = useMemo(() => {
    const entries = Object.entries(colFilters).filter(([, s]) => s && s.size > 0);

    if (entries.length === 0) return viewRows;

    return viewRows.filter((r) => {
      const st = states[rowKey(r)];

      return entries.every(([key, set]) => {
        const c = COLUMNS.find((c) => c.key === key);
        const v = displayValue(r, key, st, c?.type) || "(فارغ)";
        return set.has(v);
      });
    });
  }, [viewRows, colFilters, states]);

  const filtered = useMemo(() => {
    const s = q.trim();

    if (!s) return colFiltered;

    return colFiltered.filter((r) => {
      const st = states[rowKey(r)];

      return activeColumns.some((c) => {
        const v = displayValue(r, c.key, st, c.type);
        return v && v.includes(s);
      });
    });
  }, [colFiltered, q, states, activeColumns]);

  const setEdit = (key: string, col: string, value: any) => {
    const cur = states[key]?.edits || {};
    update(key, { edits: { ...cur, [col]: value } });
  };

  const setRowColor = (key: string, color: string | null) => {
    const cur = states[key]?.edits || {};
    const next = { ...cur };

    if (color) next.__rowColor = color;
    else delete next.__rowColor;

    update(key, { edits: next });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-primary">
        <div className="max-w-[1600px] mx-auto px-4 h-12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#133E35]">
            <Wallet className="size-4 text-primary" />
            <span className="font-bold text-sm">
              {VIEW_LABELS[view as WalletViewFilter] ?? "محفظتي"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1">
              <Link to="/">
                <ArrowRight className="size-4" />
                رجوع
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-4 space-y-3">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <div className="text-xs font-bold text-[#133E35]">
            عدد السجلات: {filtered.length.toLocaleString("en-US")}
            {filtered.length !== viewRows.length && ` / ${viewRows.length.toLocaleString("en-US")}`}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث في كل الأعمدة..."
            className="pr-9 h-9"
          />
        </div>

        <div dir="ltr" className="border rounded-lg overflow-auto max-h-[calc(100vh-180px)] bg-white">
          {loading ? (
            <div dir="rtl" className="p-10 text-center text-sm text-muted-foreground">
              جاري تحميل المحفظة...
            </div>
          ) : error ? (
            <div dir="rtl" className="p-10 text-center text-sm text-red-600">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div dir="rtl" className="p-10 text-center text-sm text-muted-foreground">
              لا توجد بيانات
            </div>
          ) : (
            <Table className="text-[11px] border-collapse">
              <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                  <TableHead className="text-center font-bold text-[#133E35] whitespace-nowrap border border-[#d4ddd9] bg-secondary">
                    #
                  </TableHead>

                  {activeColumns.map((c) => (
                    <ColumnHeader
                      key={c.key}
                      col={c}
                      rows={viewRows}
                      states={states}
                      selected={colFilters[c.key]}
                      onChange={(set) =>
                        setColFilters((prev) => {
                          const next = { ...prev };

                          if (!set || set.size === 0) delete next[c.key];
                          else next[c.key] = set;

                          return next;
                        })
                      }
                    />
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((row, i) => {
                  const key = rowKey(row);
                  const st = states[key];
                  const rowColor = st?.edits?.__rowColor as string | undefined;

                  return (
                    <TableRow
                      key={i}
                      className="hover:bg-muted/40"
                      style={rowColor ? { backgroundColor: rowColor } : undefined}
                    >
                      <TableCell className="tabular-nums text-muted-foreground border border-[#e5ebe8] text-center p-1">
                        <div className="flex items-center justify-center gap-1">
                          {!readOnly && (
                            <RowColorPicker
                              value={rowColor || null}
                              onChange={(c) => setRowColor(key, c)}
                            />
                          )}
                          <span>{i + 1}</span>
                        </div>
                      </TableCell>

                      {activeColumns.map((c) => {
                        const isMoney = MONEY_KEYS.has(c.key);
                        const align = isMoney ? "text-right" : "text-center";
                        const baseCls = `whitespace-nowrap text-[#133E35] border border-[#e5ebe8] ${align}`;
                        const eff = effectiveValue(row, c.key, st, c.type);

                        if (c.type === "yesno") {
                          const isYesVal = eff === "Yes";

                          if (readOnly) {
                            return (
                              <TableCell key={c.key} dir="rtl" className={`${baseCls} p-1`}>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${
                                    isYesVal
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-gray-50 text-gray-600"
                                  }`}
                                >
                                  {eff || "—"}
                                </span>
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell key={c.key} dir="rtl" className={`${baseCls} p-1`}>
                              <Select
                                value={eff === "Yes" ? "Yes" : "No"}
                                onValueChange={(v) => setEdit(key, c.key, v)}
                              >
                                <SelectTrigger
                                  className={`h-7 text-[11px] px-2 text-right justify-start flex-row font-extrabold w-20 border-[#e5ebe8] mx-auto rounded ${
                                    isYesVal
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-gray-50 text-gray-600"
                                  }`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-right">
                                  <SelectItem value="Yes" className="text-right font-bold text-emerald-700">
                                    Yes
                                  </SelectItem>
                                  <SelectItem value="No" className="text-right font-bold text-gray-600">
                                    No
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        }

                        if (c.type === "reqType") {
                          return (
                            <TableCell key={c.key} dir="rtl" className={baseCls}>
                              {readOnly ? (
                                eff || "—"
                              ) : (
                                <Select value={eff || undefined} onValueChange={(v) => setEdit(key, c.key, v)}>
                                  <SelectTrigger className="h-7 text-[11px] px-2">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {REQ_OPTIONS.map((o) => (
                                      <SelectItem key={o} value={o}>
                                        {o}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          );
                        }

                        if (c.type === "action") {
                          const actionStyleInline = eff ? actionStyle(eff) : undefined;

                          if (readOnly) {
                            return (
                              <TableCell key={c.key} dir="rtl" className={`${baseCls} p-1`}>
                                {eff ? (
                                  <span
                                    className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold border"
                                    style={actionStyleInline}
                                  >
                                    {eff}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell key={c.key} dir="rtl" className={`${baseCls} p-1`}>
                              <Select value={eff || undefined} onValueChange={(v) => setEdit(key, c.key, v)}>
                                <SelectTrigger
                                  className="h-7 text-[11px] px-2 text-right justify-between flex-row font-extrabold w-32 border-[#e5ebe8] mx-auto rounded"
                                  style={actionStyleInline}
                                >
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent dir="rtl" className="min-w-[140px]">
                                  {ACTION_OPTIONS.map((o) => (
                                    <SelectItem
                                      key={o.value}
                                      value={o.value}
                                      style={{ color: o.color }}
                                      className="text-right flex justify-end font-extrabold text-[12px] cursor-pointer"
                                    >
                                      <span className="flex items-center gap-2 w-full justify-end text-right">
                                        <span>{o.label}</span>
                                        <span
                                          className="inline-block w-2 h-2 rounded-full shrink-0"
                                          style={{ backgroundColor: o.color }}
                                        />
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        }

                        if (c.type === "editText") {
                          return (
                            <TableCell key={c.key} dir="rtl" className={baseCls}>
                              {readOnly ? (
                                eff || "—"
                              ) : (
                                <Input
                                  defaultValue={eff}
                                  onBlur={(e) => {
                                    if (e.target.value !== eff) setEdit(key, c.key, e.target.value);
                                  }}
                                  className={`h-7 text-[11px] px-2 ${
                                    isMoney ? "text-right" : "text-center"
                                  }`}
                                />
                              )}
                            </TableCell>
                          );
                        }

                        const display = displayValue(row, c.key, st, c.type);

                        return (
                          <TableCell key={c.key} dir="rtl" className={baseCls}>
                            {display}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}

function ColumnHeader({
  col,
  rows,
  states,
  selected,
  onChange,
}: {
  col: { key: string; label: string; type?: ColType };
  rows: any[];
  states: Record<string, any>;
  selected: Set<string> | undefined;
  onChange: (set: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const uniques = useMemo(() => {
    const set = new Set<string>();

    for (const r of rows) {
      const st = states[rowKey(r)];
      const v = displayValue(r, col.key, st, col.type) || "(فارغ)";
      set.add(v);
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [rows, states, col]);

  const visible = useMemo(() => {
    const s = search.trim();

    if (!s) return uniques;

    return uniques.filter((u) => u.includes(s));
  }, [uniques, search]);

  const isActive = selected && selected.size > 0;
  const current = selected ?? new Set(uniques);

  return (
    <TableHead className="text-center font-bold text-[#133E35] whitespace-nowrap border border-[#d4ddd9] bg-secondary">
      <div className="flex items-center justify-center gap-1">
        <span>{col.label}</span>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`p-0.5 rounded hover:bg-white/60 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              title="فلترة"
            >
              <Filter className="size-3" />
            </button>
          </PopoverTrigger>

          <PopoverContent dir="rtl" className="w-64 p-2" align="center">
            <div className="flex items-center gap-1 mb-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                className="h-7 text-[11px]"
              />

              {isActive && (
                <button
                  type="button"
                  className="text-[10px] text-red-600 px-1"
                  onClick={() => {
                    onChange(new Set());
                    setOpen(false);
                  }}
                  title="مسح الفلتر"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 px-1 pb-1 border-b mb-1">
              <Checkbox
                checked={current.size === uniques.length}
                onCheckedChange={(v) => {
                  if (v) onChange(new Set());
                  else onChange(new Set(["__none__"]));
                }}
              />
              <span className="text-[11px]">تحديد الكل</span>
            </div>

            <div className="max-h-64 overflow-auto space-y-1">
              {visible.map((u) => {
                const checked = current.has(u);

                return (
                  <label
                    key={u}
                    className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-muted/40 rounded"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = new Set(current);

                        if (v) next.add(u);
                        else next.delete(u);

                        if (next.size === uniques.length) onChange(new Set());
                        else onChange(next);
                      }}
                    />
                    <span className="text-[11px] truncate" title={u}>
                      {u}
                    </span>
                  </label>
                );
              })}

              {visible.length === 0 && (
                <div className="text-[11px] text-muted-foreground text-center py-2">
                  لا نتائج
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TableHead>
  );
}

function RowColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseColor(value), [value]);
  const [hex, setHex] = useState(parsed.hex);
  const [opacity, setOpacity] = useState(parsed.opacity);

  useEffect(() => {
    setHex(parsed.hex);
    setOpacity(parsed.opacity);
  }, [parsed.hex, parsed.opacity]);

  const swatches = [
    "#FEF3C7",
    "#D1FAE5",
    "#DBEAFE",
    "#FECACA",
    "#E5E7EB",
    "#FBCFE8",
    "#DDD6FE",
    "#FED7AA",
  ];

  const apply = (h: string, op: number) => {
    onChange(hexToRgba(h, op));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-3.5 h-3.5 rounded-sm border border-gray-400"
          style={{ background: value || "white" }}
          title="لون الصف"
        />
      </PopoverTrigger>

      <PopoverContent dir="rtl" className="w-56 p-2" align="center">
        <div className="grid grid-cols-4 gap-1 mb-2">
          {swatches.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full h-7 rounded border border-gray-300"
              style={{ background: hexToRgba(s, opacity) }}
              onClick={() => {
                setHex(s);
                apply(s, opacity);
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input
            type="color"
            value={hex}
            onChange={(e) => {
              setHex(e.target.value);
              apply(e.target.value, opacity);
            }}
            className="w-8 h-7 border rounded"
          />

          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground">
              الشفافية: {Math.round(opacity * 100)}%
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => {
                const op = Number(e.target.value) / 100;
                setOpacity(op);
                apply(hex, op);
              }}
              className="w-full"
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-[11px]"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
        >
          إزالة اللون
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function parseColor(v: string | null): { hex: string; opacity: number } {
  if (!v) return { hex: "#FEF3C7", opacity: 0.5 };

  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);

  if (m) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    const a = m[4] != null ? Number(m[4]) : 1;

    const hex =
      "#" +
      [r, g, b]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();

    return { hex, opacity: a };
  }

  if (v.startsWith("#")) return { hex: v.toUpperCase(), opacity: 1 };

  return { hex: "#FEF3C7", opacity: 0.5 };
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
