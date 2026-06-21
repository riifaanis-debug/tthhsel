import type React from "react";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Phone,
  MessageCircle,
  Search,
  Upload,
  RotateCcw,
  Users,
  Wallet,
  AlertTriangle,
  BadgeCheck,
  X,
  Filter,
  Copy,
  Check,
  FileSpreadsheet,
  Calculator,
  Menu,
  Scale,
  Eye,
  ArrowLeft,
  Send,
  User,
  CreditCard,
  Tag,
  Target,
  IdCard,
  Smartphone,
  BarChart3,
  UserX,
  UsersRound,
  Percent,
  CalendarCheck2,
  FileText,
  Clock,
  Calendar,
  Snowflake,
  Gavel,
  Landmark,
  Bookmark,
  Lock,
  Coins,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useWallet, useCustomerStates } from "@/lib/wallet-store";
import { clearSession, getSession } from "@/components/LoginGate";
import { usePermissions } from "@/hooks/use-permissions";
import {
  isYesStrict,
  isFilled,
  isPromise,
  isExemptionRequest,
  isRescheduleRequest,
  isOwnedByCollector,
} from "@/lib/wallet-predicates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  loadPolicies,
  loadActiveId,
  computeDebtAge,
  ageBucketFor,
  getDiscountRate,
  type ProductType,
  type CaseStatus,
} from "@/lib/discount-policy";
import { ThirdPartyDialog } from "@/components/ThirdPartyDialog";
import { QuickActionsHub } from "@/components/QuickActionsHub";
import CollectorInfoCard from "@/components/CollectorInfoCard";


import pfIcon from "@/assets/pf-icon.png.asset.json";
import alIcon from "@/assets/al-icon.png.asset.json";
import ccIcon from "@/assets/cc-icon.png.asset.json";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.11 4.91A10 10 0 0 0 2.05 14.93L1 21l6.22-1.02a10 10 0 0 0 4.78 1.21h.01A10 10 0 0 0 19.11 4.91Zm-7.1 14.36h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.69.6.62-3.6-.2-.31a8.3 8.3 0 1 1 7.81 4.65Zm4.55-6.22c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.56.13-.17.25-.65.81-.79.97-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.39-1.72c-.14-.25-.01-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.13.17 1.74 2.66 4.22 3.73.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}
import {
  type Customer,
  customerKey,
  formatCurrency,
  formatPhone,
  normalizePhone,
} from "@/lib/wallet-types";
import { getActiveMessage } from "@/lib/wa-templates";
import { freezeFromJwo, readJwo } from "@/lib/freeze-date";

const firstName = (full?: string | null) => {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/)[0];
};
const WA_TEMPLATE = (clientFirst: string, _agentFirst: string) =>
  `*السلام عليكم ورحمة الله*

عميلنا  : *${clientFirst}*

تحيه طيبه وبعد🤍

معك :  ———

*من إدارة البنك الأهلي السعودي بجدة*

*الإدارة العامة*

أعتذر على الإزعاج 

تواصلي معك بخصوص مبلغ المديونية القائم عليك لدى البنك الأهلي السعودي

إذا حاب تستفيد من الخصم المقدم لك من البنك الأهلي بموجب خطاب تسويه ، أو مناقشة بدائل أخرى لمعالجة التعثر، ومن ضمنها :

✔︎ *إعادة الجدولة*

✔︎ *شراء المديونية*

✔︎ *تقديم طلب إعفاء من المديونية*

في حال وجود تقرير طبي يوضح العجز وعدم اللياقة الطبية للعمل.

ويهدف هذا التواصل إلى دراسة إمكانية معالجة التعثر والوقوف على رغبتكم ، والإستماع إلى مقترحاتكم ، والعمل معكم للوصول إلى حل مناسب لكم أولًا ، وبما ترونه أنتم ملائماً حسب وضعكم المالي وبما يتوافق مع الأنظمة المعمول بها 

*وشكراً 🤍*`;

function HeaderDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const weekday = now.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long" });
  const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <p className="text-xs text-muted-foreground truncate tabular-nums">
      {weekday} · {time} · {date}
    </p>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  colorClasses: { bg: string; text: string; border: string; hoverBg: string };
}

function ActionButton({ label, onClick, disabled, icon: Icon, colorClasses }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-20 flex flex-col items-center justify-center bg-white border border-[#eaeaea] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 hover:scale-[1.04] active:scale-[0.96] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-[#133E35]/15 disabled:opacity-40 disabled:pointer-events-none p-1.5 cursor-pointer group"
    >
      <div
        className={`w-11 h-11 rounded-xl mb-1 flex items-center justify-center ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-colors duration-250 group-hover:${colorClasses.hoverBg}`}
      >
        <Icon className="size-5 stroke-[2.25]" />
      </div>
      <p className="text-[10.5px] font-extrabold text-[#2a2a2a] tracking-tight leading-none truncate max-w-full px-0.5">
        {label}
      </p>
    </button>
  );
}

export default function WalletApp() {
  const { customers: rawCustomers, meta, hydrated, replaceData, resetData } = useWallet();
  const { states, update, addLog } = useCustomerStates();
  const perms = usePermissions();

  const customers = useMemo(() => {
    const session = getSession();
    if (!session) return [];
    if (session.role === "collector") {
      return rawCustomers.filter((c) =>
        isOwnedByCollector(
          (c as any)["ID AGENT"] ?? c["الرقم الوظيفي للمحصل"] ?? (c as any)["agent_employee_id"],
          c["اسم المحصل"],
          session.employeeId,
          (session as any).name,
        ),
      );
    }
    return rawCustomers;
  }, [rawCustomers]);


  const [q, setQ] = useState("");
  const [searchBy, setSearchBy] = useState<"name" | "id" | "phone" | "account">("name");
  const [filterType, setFilterType] = useState<"product" | "salary" | "death" | "request">(
    "product",
  );
  const [filterValue, setFilterValue] = useState<string>("all");
  const [openCustomer, setOpenCustomer] = useState<Customer | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(100);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayLimit(100);
  }, [q, filterValue, filterType, searchBy]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const key = (ev as CustomEvent<string>).detail;
      if (!key) return;
      const found = customers.find((c) => customerKey(c) === key);
      if (found) setOpenCustomer(found);
    };
    window.addEventListener("open-customer", handler as EventListener);
    return () => window.removeEventListener("open-customer", handler as EventListener);
  }, [customers]);

  const products = useMemo(
    () =>
      Array.from(
        new Set(customers.map((c) => c["نوع المنتج"] ?? c["المنتج"]).filter(Boolean)),
      ) as string[],
    [customers],
  );
  // Strict per spec: a row counts as having a previous request ONLY when
  // "رقم طلب سيبل" / "رقم طلب سبيل" is filled with a real value.
  const isYes = isYesStrict;
  const hasRequest = (c: Customer) =>
    isFilled(c["رقم طلب سيبل"]) ||
    isFilled(c["رقم طلب سبيل"]) ||
    isFilled((c as any)["رقم الطلب في نظام سيبل"]);

  const filtered = useMemo(() => {
    const term = q.trim();
    return customers
      .filter((c) => {
        if (filterValue !== "all") {
          if (filterType === "product") {
            const p = String(c["نوع المنتج"] ?? c["المنتج"] ?? "").toUpperCase();
            if (!p.includes(filterValue)) return false;
          } else if (filterType === "salary") {
            const yes = isYes(c["عميل رواتب"]);
            if (filterValue === "yes" && !yes) return false;
            if (filterValue === "no" && yes) return false;
          } else if (filterType === "death") {
            const yes = isYes(c["عميل متوفي"]);
            if (filterValue === "yes" && !yes) return false;
            if (filterValue === "no" && yes) return false;
          } else if (filterType === "request") {
            const yes = hasRequest(c);
            if (filterValue === "yes" && !yes) return false;
            if (filterValue === "no" && yes) return false;
          }
        }
        if (term) {
          const fieldMap = {
            name: c["اسم العميل"],
            id: c["رقم الهوية"],
            phone: c["رقم الجوال"],
            account: c["رقم الحساب"],
          } as const;
          const val = String(fieldMap[searchBy] ?? "");
          if (!val.includes(term)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          (Number(b["مبلغ المديونية"] ?? b["المبلغ"]) || 0) -
          (Number(a["مبلغ المديونية"] ?? a["المبلغ"]) || 0),
      );
  }, [customers, q, searchBy, filterType, filterValue]);

  const stats = useMemo(() => {
    let total = 0;
    let death = 0;
    let salary = 0;
    let promise = 0;
    let pf = 0;
    let al = 0;
    let cc = 0;
    let sibel = 0;

    for (const c of customers) {
      const k = customerKey(c);
      const amt = Number(c["مبلغ المديونية"] ?? c["المبلغ"]) || 0;
      total += amt;

      const p = String(c["نوع المنتج"] ?? c["المنتج"] ?? "").toUpperCase();
      if (p.includes("PF")) pf++;
      else if (p.includes("AL")) al++;
      else if (p.includes("CC")) cc++;

      if (isYes(c["عميل رواتب"])) salary++;
      if (isYes(c["عميل متوفي"])) death++;

      if (hasRequest(c)) sibel++;

      const st = states[k];
      const act = (st?.edits?.["الاكشن"] ?? c["الاكشن"]) as string | undefined;
      if (isPromise(act)) {
        promise++;
      }
    }

    return {
      total,
      death,
      salary,
      promise,
      pf,
      al,
      cc,
      sibel,
      count: customers.length,
    };
  }, [customers, states]);

  // إجمالي المحقق = مجموع عمود "السداد" لحسابات المحصل الحالي (من ملف المحفظة)
  // مع تفضيل أي تعديل لاحق من المحصل (edits["السداد"] أو paymentAmount).
  const totalCollected = useMemo(() => {
    const toNum = (v: unknown) => {
      if (v == null) return 0;
      const s = String(v).replace(/[^\d.\-]/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    };
    let sum = 0;
    for (const c of customers) {
      const k = customerKey(c);
      const st: any = states[k];
      const edited = st?.edits?.["السداد"];
      const pay = st?.paymentAmount;
      const fromFile = (c as any)["السداد"];
      const v =
        edited != null && String(edited).trim() !== ""
          ? toNum(edited)
          : Number.isFinite(Number(pay)) && Number(pay) > 0
            ? Number(pay)
            : toNum(fromFile);
      sum += v;
    }
    return sum;
  }, [customers, states]);

  const filteredStats = useMemo(() => {
    let balance = 0;
    let pf = 0;
    let al = 0;
    let cc = 0;
    let salary = 0;
    let death = 0;
    let sibel = 0;

    for (const c of filtered) {
      const amt = Number(c["مبلغ المديونية"] ?? c["المبلغ"]) || 0;
      balance += amt;

      const p = String(c["نوع المنتج"] ?? c["المنتج"] ?? "").toUpperCase();
      if (p.includes("PF")) pf++;
      else if (p.includes("AL")) al++;
      else if (p.includes("CC")) cc++;

      if (isYes(c["عميل رواتب"])) salary++;
      if (isYes(c["عميل متوفي"])) death++;
      if (hasRequest(c)) sibel++;
    }

    return {
      balance,
      pf,
      al,
      cc,
      salary,
      death,
      sibel,
      count: filtered.length,
    };
  }, [filtered]);

  const handleUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Customer>(sheet, { defval: null });
      // normalize numeric-like ID fields to strings
      const cleaned = rows.map((r: any) => {
        const out: any = { ...r };
        ["رقم الحساب", "رقم الهوية", "رقم القضية", "رقم الجوال", "رقم الطلب في نظام سيبل"].forEach(
          (k) => {
            if (out[k] != null) {
              const num = Number(out[k]);
              out[k] =
                Number.isFinite(num) && !isNaN(num) ? String(Math.trunc(num)) : String(out[k]);
            }
          },
        );
        return out as Customer;
      });
      replaceData(cleaned, file.name);
      toast.success(`تم رفع ${cleaned.length} عميل من ${file.name}`);
    } catch (e: any) {
      toast.error("تعذر قراءة الملف: " + (e?.message || ""));
    }
  };

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
          >
            <Menu className="size-5" />
          </Button>
          <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Wallet className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">إدارة المحفظة</h1>
            <HeaderDateTime />
          </div>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSession}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      {/* Side Menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[280px] sm:w-[320px]">
          <SheetHeader>
            <SheetTitle className="text-right">القائمة</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {perms.canCalculate && (
              <Button
                asChild
                variant="outline"
                className="w-full justify-start gap-2 h-12"
                onClick={() => setMenuOpen(false)}
              >
                <Link to="/calculator">
                  <Calculator className="size-5" />
                  <span>حاسبة الخصم</span>
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => setMenuOpen(false)}
            >
              <Link to="/whatsapp-templates">
                <MessageCircle className="size-5" />
                <span>قوالب واتساب مخصصة</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => setMenuOpen(false)}
            >
              <Link to="/wallet-view" search={{ view: "wallet" }}>
                <Wallet className="size-5" />
                <span>المحفظة كاملة</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => setMenuOpen(false)}
            >
              <Link to="/wallet-view" search={{ view: "my-wallet" }}>
                <Wallet className="size-5" />
                <span>محفظتي</span>
              </Link>
            </Button>
            {/* رفع الملفات حصراً من لوحة الإدارة — تم إخفاؤها للمحصل */}
          </div>
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-7xl px-4 py-5 space-y-5">
        {/* بطاقة بيانات المحصل */}
        <CollectorInfoCard />

        {/* بطاقة ملخص المحفظة */}
        <Card className="p-4" dir="rtl">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="rounded-md border bg-muted/30 px-3 py-2 flex flex-col gap-0.5 text-right">
              <div className="text-[11px] text-muted-foreground font-bold">عدد الحسابات</div>
              <div className="text-sm font-extrabold tabular-nums">
                {stats.count.toLocaleString("en-US")}{" "}
                <span className="text-[10px] text-muted-foreground">حساب</span>
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 flex flex-col gap-0.5 text-right">
              <div className="text-[11px] text-muted-foreground font-bold">رصيد المحفظة</div>
              <div className="text-sm font-extrabold tabular-nums truncate">
                {stats.total.toLocaleString("en-US")}{" "}
                <span className="text-[10px] text-muted-foreground">SAR</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border bg-muted/30 px-2 py-2 flex flex-col items-center gap-0.5">
              <div className="text-[11px] font-bold text-[#f59e0b]">PF</div>
              <div className="text-sm font-extrabold tabular-nums">
                {stats.pf} <span className="text-[11px] font-bold">حساب</span>
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 px-2 py-2 flex flex-col items-center gap-0.5">
              <div className="text-[11px] font-bold text-[#3b82f6]">AL</div>
              <div className="text-sm font-extrabold tabular-nums">
                {stats.al} <span className="text-[11px] font-bold">حساب</span>
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 px-2 py-2 flex flex-col items-center gap-0.5">
              <div className="text-[11px] font-bold text-[#ff4d6d]">CC</div>
              <div className="text-sm font-extrabold tabular-nums">
                {stats.cc} <span className="text-[11px] font-bold">حساب</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Collector unified dashboard */}
        <div className="max-w-md mx-auto">
          <QuickActionsHub
            collected={totalCollected}
            totalAccounts={stats.count}
            totalBalance={stats.total}
            filteredAccounts={stats.count}
            filteredBalance={stats.total}
            filteredPF={stats.pf}
            filteredAL={stats.al}
            filteredCC={stats.cc}
            filteredSalary={stats.salary}
            filteredDeceased={stats.death}
            filteredSibel={stats.sibel}
          />
        </div>

        {/* Search */}
        <Card className="p-3 md:p-4">
          <div className="flex gap-2">
            <Select value={searchBy} onValueChange={(v) => setSearchBy(v as typeof searchBy)}>
              <SelectTrigger className="w-[140px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">رقم الهوية</SelectItem>
                <SelectItem value="account">رقم الحساب</SelectItem>
                <SelectItem value="phone">رقم الجوال</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث…"
                className="pr-9"
                inputMode={searchBy === "name" ? "text" : "numeric"}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-3 md:p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground shrink-0" />
            <Select
              value={filterType}
              onValueChange={(v) => {
                setFilterType(v as typeof filterType);
                setFilterValue("all");
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">نوع المنتج</SelectItem>
                <SelectItem value="salary">عميل رواتب</SelectItem>
                <SelectItem value="death">عميل متوفي</SelectItem>
                <SelectItem value="request">عميل لديه طلب في سيبل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {filterType === "product" ? (
                  <>
                    <SelectItem value="PF">PF</SelectItem>
                    <SelectItem value="AL">AL</SelectItem>
                    <SelectItem value="CC">CC</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground text-left">
            {filtered.length.toLocaleString("en-US")} نتيجة
          </div>
        </Card>

        {/* List */}
        <section className="space-y-2">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">لا توجد نتائج مطابقة</Card>
          )}
          {filtered.slice(0, displayLimit).map((c) => {
            const k = customerKey(c);
            const st = states[k];
            const reqType = String(st?.edits?.["نوع الطلب"] ?? c["نوع الطلب"] ?? "");
            const hasExemption = isExemptionRequest(reqType);
            const hasReschedule = isRescheduleRequest(reqType);
            return (
              <CustomerRow
                key={k}
                c={c}
                contacted={!!st?.contacted}
                action={(st?.edits?.["الاكشن"] ?? c["الاكشن"]) as string | null | undefined}
                hasExemption={hasExemption}
                hasReschedule={hasReschedule}
                onOpen={() => setOpenCustomer(c)}
                onCall={() => onCall(c, addLog)}
                onWhats={() => onWhats(c, addLog)}
                onCopy={() => onCopy(c)}
              />
            );
          })}
          {filtered.length > displayLimit && (
            <div className="pt-2 text-center pb-6">
              <Button
                variant="outline"
                className="w-full max-w-xs border-primary/20 hover:bg-primary/5 text-primary text-xs"
                onClick={() => setDisplayLimit((prev) => prev + 100)}
              >
                تحميل المزيد (+100)
              </Button>
            </div>
          )}
        </section>
      </main>

      <CustomerSheet
        customer={openCustomer}
        onClose={() => setOpenCustomer(null)}
        state={openCustomer ? states[customerKey(openCustomer)] : undefined}
        onUpdate={(patch) => openCustomer && update(customerKey(openCustomer), patch)}
        onCall={() => openCustomer && onCall(openCustomer, addLog)}
        onWhats={() => openCustomer && onWhats(openCustomer, addLog)}
      />
      
    </div>
  );
}

function onCall(c: Customer, addLog: (k: string, l: any) => void) {
  const p = normalizePhone(c["رقم الجوال"]);
  if (!p) return toast.error("لا يوجد رقم جوال لهذا العميل");
  addLog(customerKey(c), { date: new Date().toISOString(), channel: "call" });
  window.location.href = `tel:+${p}`;
}
function onWhats(c: Customer, addLog: (k: string, l: any) => void) {
  const p = normalizePhone(c["رقم الجوال"]);
  if (!p) return toast.error("لا يوجد رقم جوال لهذا العميل");
  const clientFirst = firstName(c["اسم العميل"]) || "العميل";
  const text = getActiveMessage(clientFirst);
  addLog(customerKey(c), { date: new Date().toISOString(), channel: "whatsapp" });
  window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`, "_blank");
}
function onCopy(c: Customer) {
  const p = normalizePhone(c["رقم الجوال"]);
  if (!p) return toast.error("لا يوجد رقم");
  navigator.clipboard.writeText("+" + p);
  toast.success("تم نسخ الرقم");
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className={`p-2 ${accent ? "bg-primary text-primary-foreground border-primary" : ""}`}>
      <div className="flex items-center gap-1.5">
        <div
          className={`size-6 rounded-md grid place-items-center shrink-0 ${accent ? "bg-primary-foreground/15" : "bg-accent text-accent-foreground"}`}
        >
          {icon}
        </div>
        <div
          className={`text-[10px] truncate ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}
        >
          {label}
        </div>
      </div>
      <div className="mt-1 text-sm font-bold leading-tight tabular-nums truncate">{value}</div>
    </Card>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[120px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">كل {placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Toggle({ label, v, onV }: { label: string; v: boolean; onV: (b: boolean) => void }) {
  return (
    <label
      className={`flex items-center gap-2 px-3 h-9 rounded-md border cursor-pointer text-sm ${v ? "bg-accent border-primary/40" : "bg-background"}`}
    >
      <Switch checked={v} onCheckedChange={onV} />
      <span>{label}</span>
    </label>
  );
}

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

function CustomerRow({
  c,
  contacted,
  action,
  hasExemption,
  hasReschedule,
  onOpen,
  onCall,
  onWhats,
  onCopy,
}: {
  c: Customer;
  contacted: boolean;
  action?: string | null;
  hasExemption?: boolean;
  hasReschedule?: boolean;
  onOpen: () => void;
  onCall: () => void;
  onWhats: () => void;
  onCopy: () => void;
}) {
  const phone = normalizePhone(c["رقم الجوال"]);
  const isPromise = action === "وعد سداد";
  return (
    <Card className="relative p-3 hover:shadow-md transition-shadow">
      {isPromise && (
        <span className="absolute -top-2 -right-3 z-10 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide bg-black text-amber-300 shadow-[0_0_14px_2px_rgba(251,191,36,0.55)] ring-1 ring-amber-400/60 -rotate-12 animate-pulse">
          وعد سداد
        </span>
      )}
      <button
        onClick={onOpen}
        aria-label="فتح صفحة العميل"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <ArrowLeft className="size-4" />
        <Eye className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <button onClick={onOpen} className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{c["اسم العميل"] || "بدون اسم"}</span>
            {contacted && (
              <Badge className="bg-success text-success-foreground border-0">تم التواصل</Badge>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2.5 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {c["المنتج"] || "—"}
            </Badge>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(c["المبلغ"])}{" "}
              <span className="text-xs text-muted-foreground font-medium">SAR</span>
            </span>
            {c["عميل متوفي"] ? (
              <Badge variant="destructive">متوفى</Badge>
            ) : c["عميل رواتب"] ? (
              <Badge variant="secondary">رواتب</Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {c["التثبيت"] && <span>التثبيت: {c["التثبيت"]}</span>}
          </div>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <Button
          size="icon"
          variant="default"
          onClick={onCall}
          disabled={!phone}
          className="size-8"
          aria-label="اتصال"
        >
          <Phone className="size-4" />
        </Button>
        <Button
          size="icon"
          onClick={onWhats}
          disabled={!phone}
          className="size-8 bg-success text-success-foreground hover:bg-success/90"
          aria-label="واتساب"
        >
          <WhatsAppIcon className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={onCopy}
          disabled={!phone}
          className="size-8"
          aria-label="نسخ"
        >
          <Copy className="size-4" />
        </Button>
        {(hasExemption || hasReschedule) && (
          <span
            className={`mr-auto px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse ${
              hasExemption
                ? "text-yellow-950 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 shadow-[0_0_12px_2px_rgba(234,179,8,0.75)]"
                : "text-white bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400 shadow-[0_0_12px_2px_rgba(59,130,246,0.75)]"
            }`}
          >
            طلب سابق - {hasExemption ? "إعفاء" : "جدولة"}
          </span>
        )}
      </div>
    </Card>
  );
}

function CustomerSheet({
  customer,
  onClose,
  state,
  onUpdate,
  onCall,
  onWhats,
}: {
  customer: Customer | null;
  onClose: () => void;
  state?: any;
  onUpdate: (patch: any) => void;
  onCall: () => void;
  onWhats: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [thirdPartyOpen, setThirdPartyOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardRateInput, setCardRateInput] = useState("");
  const [cardExtra5Applied, setCardExtra5Applied] = useState(false);

  useEffect(() => {
    setDirty(false);
    setNoteDraft("");
  }, [customer]);

  // حساب التسوية (يجب أن تُستدعى الـHooks قبل أي return مبكر)
  // تاريخ التجميد / التعثر = JWO_DT - 3 months (computed, never manual).
  const computedFreeze: string = freezeFromJwo(readJwo(customer)) || "";
  const freezeOverride = (state?.edits as any)?.["تاريخ التجميد"] as string | undefined;
  const defaultDate: string = (freezeOverride && String(freezeOverride)) || computedFreeze;

  const productRaw = String(customer?.["المنتج"] || "").toUpperCase();
  const product: ProductType = productRaw.includes("AL")
    ? "AL"
    : productRaw.includes("CC")
      ? "CC"
      : "PF";
  const caseStatus: CaseStatus =
    (state?.edits?.["رقم القضية"] ?? customer?.["رقم القضية"]) ? "with_case" : "no_case";
  const amount = Number(customer?.["المبلغ"]) || 0;
  const settlement = useMemo(() => {
    if (!defaultDate) return null;
    const today = new Date().toISOString().slice(0, 10);
    const { years } = computeDebtAge(defaultDate, today);
    if (!years) return null;
    const policies = loadPolicies();
    const policy = policies[loadActiveId()];
    if (!policy) return null;
    const bucket = ageBucketFor(years, product, {});
    const rate = getDiscountRate(policy, product, caseStatus, "with_client", bucket);
    const settle = amount * (1 - rate);
    return { years, rate, settle };
  }, [defaultDate, product, caseStatus, amount]);

  if (!customer) return null;
  const c = customer;
  const phone = normalizePhone(c["رقم الجوال"]);

  const markDirtyUpdate = (patch: any) => {
    setDirty(true);
    onUpdate(patch);
  };

  const requestClose = () => {
    if (dirty) setConfirmOpen(true);
    else onClose();
  };

  return (
    <>
      <Sheet open={!!customer} onOpenChange={(o) => !o && requestClose()}>
        <SheetContent
          side="left"
          className="w-full sm:max-w-md overflow-y-auto [&>button.absolute]:left-4 [&>button.absolute]:right-auto [&>button.absolute]:top-3 p-2.5 sm:p-4 pt-12 sm:pt-12 bg-[#FBFAF7] border-[#e8e6e1]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{c["اسم العميل"]}</SheetTitle>
          </SheetHeader>

          <div className="mt-2 space-y-3" dir="rtl">
            {/* Header: name (right) + debt amount (left) — pill cards with label + icon */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Name card (right in RTL) */}
              <div className="rounded-2xl bg-white px-3 pt-2 pb-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.05)] border border-[#ececec]">
                <div
                  dir="rtl"
                  className="flex flex-row items-center justify-start gap-1.5 text-[#3a3a3a] font-bold text-[12px] mb-1.5"
                >
                  <User className="size-3.5 text-[#5a6b63]" />
                  <span>اسم العميل :</span>
                </div>
                <div
                  dir="rtl"
                  className="h-7 rounded-xl bg-white shadow-inner border border-[#ececec] px-2 flex items-center justify-start text-right text-[11px] text-[#3a3a3a] font-semibold truncate"
                >
                  {c["اسم العميل"] || ""}
                </div>
              </div>
              {/* Debt amount card (left in RTL) */}
              <div className="rounded-2xl bg-white px-3 pt-2 pb-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.05)] border border-[#ececec]">
                <div
                  dir="rtl"
                  className="flex flex-row items-center justify-start gap-1.5 text-[#3a3a3a] font-bold text-[12px] mb-1.5"
                >
                  <Wallet className="size-3.5 text-[#5a6b63]" />
                  <span>مبلغ المديونية :</span>
                </div>
                <div
                  dir="rtl"
                  className="h-7 rounded-xl bg-white shadow-inner border border-[#ececec] px-2 text-right leading-7 text-[11px] font-bold text-[#0E8F4F] tabular-nums"
                >
                  {formatCurrency(c["مبلغ المديونية"] ?? c["المبلغ"]) === "—"
                    ? ""
                    : formatCurrency(c["مبلغ المديونية"] ?? c["المبلغ"])}
                </div>
              </div>
            </div>

            {/* Four action buttons (RTL right→left): WhatsApp | Call | 3rd party | Settlement Card */}
            <div dir="rtl" className="grid grid-cols-4 items-center gap-2 sm:gap-3 py-2">
              <button
                type="button"
                onClick={onWhats}
                disabled={!phone}
                className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2.5 bg-white hover:bg-emerald-50/50 border border-[#ececec] hover:border-emerald-250 rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.08)] transition-all duration-300 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none cursor-pointer group min-h-[72px] sm:min-h-[88px]"
              >
                <div className="size-8 sm:size-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                  <WhatsAppIcon className="size-4.5 sm:size-5" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-[#133E35] group-hover:text-emerald-800 transition-colors text-center line-clamp-1">
                  إرسال واتساب
                </span>
              </button>
              <button
                type="button"
                onClick={onCall}
                disabled={!phone}
                className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2.5 bg-white hover:bg-blue-50/50 border border-[#ececec] hover:border-blue-250 rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)] transition-all duration-300 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none cursor-pointer group min-h-[72px] sm:min-h-[88px]"
              >
                <div className="size-8 sm:size-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Phone className="size-4 sm:size-4.5" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-[#133E35] group-hover:text-blue-800 transition-colors text-center line-clamp-1">
                  إجراء إتصال
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!settlement) {
                    toast.error(
                      "الرجاء تسجيل تاريخ التجميد ومبلغ التسوية لتتمكن من إحالة العميل إلى طرف ثالث",
                    );
                    return;
                  }
                  setThirdPartyOpen(true);
                }}
                className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2.5 bg-white hover:bg-amber-50/50 border border-[#ececec] hover:border-amber-250 rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(245,158,11,0.08)] transition-all duration-300 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none cursor-pointer group min-h-[72px] sm:min-h-[88px]"
              >
                <div className="size-8 sm:size-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                  <Users className="size-4 sm:size-4.5" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-[#133E35] group-hover:text-amber-800 transition-colors text-center line-clamp-1">
                  إسناد طرف ثالث
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCardRateInput("");
                  setCardExtra5Applied(false);
                  setCardDialogOpen(true);
                }}
                className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2.5 bg-white hover:bg-[#F2EFF6]/50 border border-[#ececec] hover:border-purple-250 rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(168,85,247,0.08)] transition-all duration-300 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none cursor-pointer group min-h-[72px] sm:min-h-[88px]"
              >
                <div className="size-8 sm:size-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                  <CreditCard className="size-4 sm:size-4.5" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-[#133E35] group-hover:text-purple-800 transition-colors text-center line-clamp-1">
                  بطاقة التسوية
                </span>
              </button>
            </div>

            {(() => {
              const e = state?.edits || {};
              const get = <K extends keyof Customer>(k: K) => {
                if (k === "السداد") {
                  return e[k] ?? state?.paymentAmount ?? c[k] ?? null;
                }
                if (k === "تاريخ التجميد") {
                  return defaultDate || null;
                }

                return (e[k] ?? c[k]) as any;
              };
              const setEdit = (patch: Partial<Customer>) => {
                setDirty(true);
                onUpdate({ edits: { ...(state?.edits || {}), ...patch } });
              };
              const currentAction = (get("الاكشن") as string) || "";
              const rawRequestType = String(get("نوع الطلب") || get("طلب الطلب") || "").trim();
              const hasRescheduleFromBase = /جدول|جدولة/.test(rawRequestType);
              const hasExemptionFromBase = /إعفاء|اعفاء/.test(rawRequestType);
              const isOn = (k: string): boolean => {
                const v = get(k);
                return v === "نعم" || v === "Yes" || v === true || v === "1" || v === 1;
              };
              const toggleYesNo = (patch: Partial<Customer>, key: string) => {
                const next = isOn(key) ? "لا" : "نعم";
                setEdit({ ...patch, [key]: next });
              };
              const ToggleBtn = ({
                label,
                active,
                onClick,
                disabled,
              }: {
                label: string;
                active: boolean;
                onClick: () => void;
                disabled?: boolean;
              }) => (
                <button
                  type="button"
                  onClick={onClick}
                  disabled={disabled}
                  className={`h-7 w-full rounded-md border text-[10px] font-bold transition-all px-1 text-center ${
                    active
                      ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                      : "bg-[#FEFFFE] border-border text-muted-foreground hover:bg-[#f8f8f8]"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {label}
                </button>
              );
              const sibylVal = (get("رقم طلب سبيل") ??
                get("رقم طلب سيبل") ??
                get("رقم الطلب في نظام سيبل") ??
                "") as string;
              const requestDisplay = (() => {
                if (!sibylVal) return "";
                if (isOn("طلب اعفاء") || hasExemptionFromBase) return "طلب إعفاء";
                if (isOn("طلب جدولة") || hasRescheduleFromBase) return "طلب جدولة";
                return "";
              })();
              const requestToneCls =
                requestDisplay === "طلب إعفاء"
                  ? "text-red-700 border-red-300 bg-red-50 font-bold"
                  : requestDisplay === "طلب جدولة"
                    ? "text-orange-700 border-orange-300 bg-orange-50 font-bold"
                    : "";
              const seizedVal = (get("أرصدة محجوزة") ??
                get("ارصدة محجوزه") ??
                get("ارصده محجوزه") ??
                "") as string;
              const isBankSeizedOn = isOn("المبلغ المحجوز لصالح البنك");
              const inputCls =
                "h-8 text-[11px] text-center bg-white border border-[#e8e6e1] rounded-md focus-visible:ring-1 focus-visible:ring-[#234E45]/30 focus-visible:ring-offset-0";
              return (
                <div className="space-y-2.5 text-right font-sans" dir="rtl">
                  {/* الصف 1: رقم الحساب | نوع المنتج */}
                  <div className="rounded-xl border border-[#e8e6e1] bg-white p-2 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <EditField label="رقم الحساب" icon={<CreditCard className="size-3" />}>
                        <Input
                          value={get("رقم الحساب") || ""}
                          readOnly
                          inputMode="none"
                          onFocus={(e) => e.currentTarget.blur()}
                          className={`${inputCls} cursor-default`}
                        />
                      </EditField>
                      <EditField label="نوع المنتج" icon={<Tag className="size-3" />}>
                        <Input
                          value={String(get("نوع المنتج") ?? get("المنتج") ?? "").toUpperCase()}
                          readOnly
                          inputMode="none"
                          onFocus={(e) => e.currentTarget.blur()}
                          className={`${inputCls} cursor-default text-center font-bold`}
                        />
                      </EditField>
                      <EditField label="NOTE" icon={<FileText className="size-3" />}>
                        <Input
                          value={String(get("NOTE") ?? get("Note") ?? get("note") ?? get("ملاحظة") ?? "")}
                          readOnly
                          inputMode="none"
                          onFocus={(e) => e.currentTarget.blur()}
                          className={`${inputCls} cursor-default text-center`}
                        />
                      </EditField>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <EditField label="الأكشن" icon={<Target className="size-3" />}>
                        <Select value={currentAction} onValueChange={(v) => setEdit({ الاكشن: v })}>
                          <SelectTrigger
                            className={`${inputCls} justify-end text-right flex-row-reverse`}
                            style={currentAction ? actionStyle(currentAction) : undefined}
                          >
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="min-w-[140px]">
                            {ACTION_OPTIONS.map((a) => (
                              <SelectItem
                                key={a.value}
                                value={a.value}
                                className="text-[12px] flex justify-end text-right w-full font-bold cursor-pointer"
                                style={{ color: a.color }}
                              >
                                <span className="flex items-center gap-2 w-full justify-end text-right">
                                  <span>{a.label}</span>
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: a.color }}
                                  />
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </EditField>
                      <EditField label="رقم الهوية" icon={<IdCard className="size-3" />}>
                        <Input
                          value={get("رقم الهوية") || ""}
                          readOnly
                          inputMode="none"
                          onFocus={(e) => e.currentTarget.blur()}
                          className={`${inputCls} cursor-default`}
                        />
                      </EditField>
                      <EditField label="رقم الجوال" icon={<Smartphone className="size-3" />}>
                        <Input
                          value={get("رقم الجوال") || ""}
                          readOnly
                          inputMode="none"
                          onFocus={(e) => e.currentTarget.blur()}
                          className={`${inputCls} cursor-default`}
                        />
                      </EditField>
                    </div>
                  </div>

                  {/* صف الشارات: تقييم أعمال | عميل متوفي | عميل رواتب — YES/NO */}
                  <div className="grid grid-cols-3 gap-2">
                    <YesNoPill
                      label="تقييم أعمال"
                      icon={<BarChart3 className="size-3.5 text-[#7B3FE4]" />}
                      tone="purple"
                      value={isOn("تقييم أعمال") ? "yes" : (get("تقييم أعمال") || get("تقييم الأعمال")) ? "no" : null}
                      onChange={(v) => setEdit({ "تقييم أعمال": v === "yes" ? "نعم" : "لا", "تقييم الأعمال": v === "yes" ? "نعم" : "لا" })}
                    />
                    <YesNoPill
                      label="عميل متوفي"
                      icon={<UserX className="size-3.5 text-[#E11D48]" />}
                      tone="red"
                      value={isOn("عميل متوفي") ? "yes" : get("عميل متوفي") ? "no" : null}
                      onChange={(v) => setEdit({ "عميل متوفي": v === "yes" ? "نعم" : "لا" })}
                    />
                    <YesNoPill
                      label="عميل رواتب"
                      icon={<UsersRound className="size-3.5 text-[#0E8F4F]" />}
                      tone="green"
                      value={isOn("عميل رواتب") ? "yes" : get("عميل رواتب") ? "no" : null}
                      onChange={(v) => setEdit({ "عميل رواتب": v === "yes" ? "نعم" : "لا" })}
                    />
                  </div>

                  {/* رقم طلب سيبل + نوع الطلب (قابلين للتعديل) */}
                  <div className="rounded-xl border border-[#e8e6e1] bg-white p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <EditField label="رقم طلب سيبل" icon={<FileText className="size-3" />}>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={sibylVal}
                          onChange={(ev) => {
                            const val = ev.target.value.replace(/[^0-9]/g, "");
                            setEdit({ "رقم طلب سيبل": val, "رقم طلب سبيل": val });
                          }}
                          className={`${inputCls} tabular-nums`}
                        />
                      </EditField>
                      <EditField label="نوع الطلب" icon={<FileText className="size-3" />}>
                        <Select
                          value={
                            isOn("طلب اعفاء") || hasExemptionFromBase
                              ? "إعفاء"
                              : isOn("طلب جدولة") || hasRescheduleFromBase
                                ? "جدولة"
                                : ""
                          }
                          onValueChange={(v) => {
                            if (v === "إعفاء") {
                              setEdit({
                                "نوع الطلب": "إعفاء متوفين",
                                "طلب اعفاء": "نعم",
                                "طلب جدولة": "لا",
                              });
                            } else {
                              setEdit({
                                "نوع الطلب": "إعادة جدولة",
                                "طلب اعفاء": "لا",
                                "طلب جدولة": "نعم",
                              });
                            }
                          }}
                        >
                          <SelectTrigger className={`${inputCls} ${requestToneCls}`}>
                            <SelectValue placeholder="اختر نوع الطلب" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="إعفاء">طلب إعفاء</SelectItem>
                            <SelectItem value="جدولة">طلب جدولة</SelectItem>
                          </SelectContent>
                        </Select>
                      </EditField>
                    </div>
                  </div>

                  {/* الصف: عمر الدين | JWO_DT | تاريخ التجميد */}
                  <div className="grid grid-cols-3 gap-2">
                    <EditField label="عمر الدين" icon={<Clock className="size-3" />}>
                      <Input
                        value={get("عمر الدين") ?? get("عدد ايام التعثر") ?? ""}
                        readOnly
                        inputMode="none"
                        onFocus={(e) => e.currentTarget.blur()}
                        className={`${inputCls} tabular-nums cursor-default`}
                      />
                    </EditField>
                    <EditField label="JWO_DT" icon={<Calendar className="size-3" />}>
                      <Input
                        value={get("jWO_DT") ?? get("jWO-DT") ?? ""}
                        readOnly
                        inputMode="none"
                        onFocus={(e) => e.currentTarget.blur()}
                        className={`${inputCls} cursor-default`}
                      />
                    </EditField>
                    <EditField label="تاريخ التجميد" icon={<Snowflake className="size-3" />}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`${inputCls} text-center w-full flex items-center justify-center gap-1 px-2`}
                          >
                            <span className="tabular-nums">{defaultDate || "—"}</span>
                            <Calendar className="size-3 text-[#234E45]" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                          <CalendarPicker
                            mode="single"
                            selected={defaultDate ? new Date(defaultDate) : undefined}
                            onSelect={(d) => {
                              if (!d) return;
                              const yyyy = d.getFullYear();
                              const mm = String(d.getMonth() + 1).padStart(2, "0");
                              const dd = String(d.getDate()).padStart(2, "0");
                              setEdit({ "تاريخ التجميد": `${yyyy}-${mm}-${dd}` });
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </EditField>
                  </div>

                  {/* صف الحاسبات: حاسبة التاريخ (يمين) | حاسبة الخصم (يسار) */}
                  <DualCalculators
                    debtAmount={Number(c["مبلغ المديونية"] ?? c["المبلغ"]) || 0}
                    freezeDate={defaultDate}
                  />

                  {/* ملاحظة أسفل الحاسبات */}
                  <div className="flex items-start gap-1.5 text-[10px] text-[#7A6A4F] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-2">
                    <AlertTriangle className="size-3 mt-0.5 text-[#D97706] shrink-0" />
                    <p className="leading-snug text-right">
                      مبلغ التسوية النهائي الصادر هو بشكل تقريبي، يرجى التأكد من تاريخ التجميد المدون في شاشة NBL وبسياسة الخصم المتبعة للشهر الحالي.
                    </p>
                  </div>

                  {/* الصف: رقم القضية | اسم المحكمة | أرصدة محجوزة */}
                  <div className="grid grid-cols-3 gap-2">
                    <EditField label="رقم القضية" icon={<Gavel className="size-3" />}>
                      <Input
                        value={get("رقم القضية") || ""}
                        readOnly
                        inputMode="none"
                        onFocus={(e) => e.currentTarget.blur()}
                        className={`${inputCls} cursor-default`}
                      />
                    </EditField>
                    <EditField label="اسم المحكمة" icon={<Landmark className="size-3" />}>
                      <Input
                        value={get("اسم المحكمة") || ""}
                        readOnly
                        inputMode="none"
                        onFocus={(e) => e.currentTarget.blur()}
                        className={`${inputCls} cursor-default`}
                      />
                    </EditField>
                    <EditField label="أرصدة محجوزة" icon={<Lock className="size-3" />}>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9.,]*"
                          placeholder="0.00"
                          value={(() => {
                            if (!seizedVal) return "";
                            const [intPart, decPart] = String(seizedVal).split(".");
                            const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                            return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
                          })()}
                          onChange={(ev) => {
                            let val = ev.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
                            const firstDot = val.indexOf(".");
                            if (firstDot !== -1) {
                              val =
                                val.slice(0, firstDot + 1) +
                                val.slice(firstDot + 1).replace(/\./g, "");
                            }
                            setEdit({
                              "أرصدة محجوزة": val,
                              "ارصدة محجوزه": val,
                              "ارصده محجوزه": val,
                            });
                          }}
                          className={`${inputCls} tabular-nums pl-10`}
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#0E8F4F]">
                          SAR
                        </span>
                      </div>
                    </EditField>
                  </div>

                  {/* الصف (RTL): ناجز (يمين) | الإجراء: الحجز التنفيذي (وسط) | أرصدة محجوزة لصالح البنك (يسار) */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => window.open("https://najiz.sa/applications/iexecution/Inquiry", "_blank")}
                      className="rounded-xl bg-gradient-to-l from-[#EFE7D1] to-[#F7F3E5] border border-[#D9C792] p-2 flex items-center justify-center gap-1 hover:shadow-md transition-all"
                    >
                      <span className="text-[10px] font-bold text-[#7B5E1F] text-center leading-tight">
                        التحقق من<br />طلب تنفيذ
                      </span>
                      <span className="text-[11px] font-extrabold text-[#A37B1A]">ناجز</span>
                    </button>
                    <EditField label="الإجراء: الحجز التنفيذي - الرقم المرجعي" icon={<Bookmark className="size-3" />}>
                      <Input
                        value={get("رقم مرجع الحجز التنفيذي") ?? get("مرجع الحجز التنفيذي") ?? ""}
                        onChange={(ev) => {
                          const val = ev.target.value.replace(/[^0-9]/g, "");
                          setEdit({
                            "رقم مرجع الحجز التنفيذي": val,
                            "مرجع الحجز التنفيذي": val,
                          });
                        }}
                        inputMode="numeric"
                        placeholder="ادخل الرقم المرجعي"
                        className={`${inputCls} tabular-nums`}
                      />
                    </EditField>
                    <EditField label="أرصدة محجوزة لصالح البنك" icon={<Coins className="size-3" />}>
                      <Input
                        value={get("أرصدة محجوزة لصالح البنك") ?? get("ارصدة محجوزه لصالح البنك") ?? ""}
                        onChange={(ev) => {
                          const val = ev.target.value.replace(/[^0-9.]/g, "");
                          setEdit({
                            "أرصدة محجوزة لصالح البنك": val,
                            "ارصدة محجوزه لصالح البنك": val,
                          });
                        }}
                        inputMode="decimal"
                        placeholder="0.00"
                        className={`${inputCls} tabular-nums`}
                      />
                    </EditField>
                  </div>

                  {/* مبلغ السداد | نوع السداد */}
                  <div className="grid grid-cols-2 gap-2">
                    <EditField label="مبلغ السداد" icon={<Wallet className="size-3" />}>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="0.00"
                          value={state?.paymentAmount ?? ""}
                          onChange={(ev) => {
                            const numVal = ev.target.value === "" ? null : Number(ev.target.value);
                            markDirtyUpdate({
                              paymentAmount: numVal,
                              ...(ev.target.value === "" ? { paymentType: null } : {}),
                            });
                            setEdit({ السداد: numVal });
                          }}
                          className={`${inputCls} tabular-nums pl-10`}
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#0E8F4F]">
                          SAR
                        </span>
                      </div>
                    </EditField>
                    <EditField label="نوع السداد" icon={<ChevronDown className="size-3" />}>
                      <Select
                        value={state?.paymentType || ""}
                        onValueChange={(v) => markDirtyUpdate({ paymentType: v })}
                      >
                        <SelectTrigger className={inputCls}>
                          <SelectValue placeholder="اختر نوع السداد" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="كاش">كاش</SelectItem>
                          <SelectItem value="جدولة">جدولة</SelectItem>
                        </SelectContent>
                      </Select>
                    </EditField>
                  </div>
                </div>
              );
            })()}

            {/* زر تم التواصل مع العميل كزر كبير ومضيء */}
            <div className="space-y-1.5 pt-2 border-t border-dashed">
              <Button
                type="button"
                variant={state?.contacted ? "default" : "outline"}
                className={`w-full h-10 font-bold transition-all text-xs ${
                  state?.contacted
                    ? "bg-emerald-600 hover:bg-emerald-600/90 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "border-primary/30 text-primary hover:bg-primary/5"
                }`}
                onClick={() => {
                  const nextContacted = !state?.contacted;
                  markDirtyUpdate({
                    contacted: nextContacted,
                    lastContactedAt: nextContacted ? new Date().toISOString() : undefined,
                  });
                }}
              >
                {state?.contacted ? "✅ تم التواصل مع العميل" : "📞 لم يتم التواصل مع العميل بعد"}
              </Button>
              {state?.lastContactedAt && (
                <p className="text-[10px] text-muted-foreground text-center">
                  آخر تواصل: {new Date(state.lastContactedAt).toLocaleString("en-US")}
                </p>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-dashed">
              <label className="text-xs font-semibold text-right block">إضافة ملاحظات جديدة</label>
              <Textarea
                value={noteDraft}
                onChange={(e) => {
                  setNoteDraft(e.target.value);
                  if (e.target.value) setDirty(true);
                }}
                placeholder="أضف ملاحظة عن آخر محاولة، الوعد بالسداد، إلخ…"
                rows={3}
                className="text-xs text-right bg-[#FEFFFE] border-[#e8e6e1]"
              />
              <p className="text-[10px] text-muted-foreground text-right">
                سيتم حفظ الملاحظة في السجل عند إغلاق صفحة العميل.
              </p>
            </div>

            {state?.noteLog?.length ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">سجل الملاحظات</label>
                <div className="space-y-1.5">
                  {[...state.noteLog].reverse().map((n: any, i: number) => (
                    <div
                      key={i}
                      className="text-xs p-2 rounded-md bg-[#FEFFFE] border border-[#e8e6e1] space-y-1"
                    >
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(n.date).toLocaleString("en-US")}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{n.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {state?.logs?.length ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">سجل المحاولات</label>
                <div className="space-y-1">
                  {[...state.logs].reverse().map((l: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs p-2 rounded-md bg-[#FEFFFE] border border-[#e8e6e1]"
                    >
                      {l.channel === "call" ? (
                        <Phone className="size-3" />
                      ) : (
                        <MessageCircle className="size-3" />
                      )}
                      <span>{l.channel === "call" ? "اتصال" : "واتساب"}</span>
                      <span className="mr-auto text-muted-foreground">
                        {new Date(l.date).toLocaleString("en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* أزرار أسفل الصفحة: حفظ | إغلاق */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed">
              <Button
                type="button"
                onClick={() => {
                  const trimmed = noteDraft.trim();
                  if (trimmed) {
                    const prev = state?.noteLog || [];
                    onUpdate({
                      noteLog: [...prev, { date: new Date().toISOString(), text: trimmed }],
                    });
                  }
                  setNoteDraft("");
                  setDirty(false);
                  toast.success("تم حفظ الإجراءات");
                }}
                className="h-10 bg-[#0E8F4F] hover:bg-[#0a7a42] text-white font-bold rounded-xl"
              >
                💾 حفظ
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={requestClose}
                className="h-10 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl"
              >
                ✕ إغلاق
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حفظ الإجراءات</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل ترغب بحفظ الإجراءات التي قمت بها على هذا العميل؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
            <AlertDialogAction
              onClick={() => {
                const trimmed = noteDraft.trim();
                if (trimmed) {
                  const prev = state?.noteLog || [];
                  onUpdate({
                    noteLog: [...prev, { date: new Date().toISOString(), text: trimmed }],
                  });
                }
                setNoteDraft("");
                setConfirmOpen(false);
                setDirty(false);
                onClose();
                toast.success("تم حفظ الإجراءات");
              }}
              className="w-full"
            >
              حفظ وإغلاق
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)} className="w-full mt-0">
              متابعة التعديل
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                setNoteDraft("");
                setConfirmOpen(false);
                setDirty(false);
                onClose();
                toast("تم الإغلاق بدون حفظ التغييرات");
              }}
            >
              خروج بدون حفظ التغييرات
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ThirdPartyDialog
        open={thirdPartyOpen}
        onOpenChange={setThirdPartyOpen}
        customerName={String(c["اسم العميل"] || "")}
        customerId={String(c["رقم الهوية"] || "")}
        settlementAmount={settlement?.settle ?? amount}
      />

      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">إصدار بطاقة التسوية</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-right block">
                الرجاء إدخال نسبة الخصم (%)
              </label>
              <span className="text-[11px] text-red-500 italic">دون إضافة 5٪ الإضافية</span>
            </div>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              placeholder="مثال: 45"
              value={cardRateInput}
              onChange={(e) => setCardRateInput(e.target.value)}
              className="text-right"
              dir="rtl"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cardExtra5Applied}
                onClick={() => {
                  if (cardExtra5Applied) {
                    toast.error("تم إضافة 5% خصم إضافي مسبقاً في هذه العملية");
                    return;
                  }
                  const current = Number(cardRateInput) || 0;
                  const next = Math.min(current + 5, 100);
                  setCardRateInput(String(next));
                  setCardExtra5Applied(true);
                }}
                className="text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                هل ترغب بإضافة 5٪ خصم إضافي
              </Button>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
            <Button
              onClick={() => {
                const r = Number(cardRateInput);
                if (!Number.isFinite(r) || r <= 0 || r > 100) {
                  toast.error("الرجاء إدخال نسبة خصم صحيحة بين 0 و 100");
                  return;
                }
                const rate = r / 100;
                const bal = Number(c["مبلغ المديونية"] ?? c["المبلغ"]) || 0;
                const discount = bal * rate;
                const settle = bal - discount;
                const productLabel =
                  product === "PF"
                    ? "التمويل الشخصي"
                    : product === "CC"
                      ? "البطاقات الائتمانية"
                      : "التمويل التأجيري";
                const payload = {
                  name: String(c["اسم العميل"] || ""),
                  idNo: String(c["رقم الهوية"] || ""),
                  accountNo: String(c["رقم الحساب"] || ""),
                  phone: String(c["رقم الجوال"] || ""),
                  productLabel,
                  rate,
                  bal,
                  discount,
                  settlement: settle,
                };
                const json = JSON.stringify(payload);
                try {
                  sessionStorage.setItem("discountCard:data", json);
                } catch {}
                const encoded = btoa(unescape(encodeURIComponent(json)));
                setCardDialogOpen(false);
                window.open(`/discount-card#d=${encoded}`, "_blank");
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              إصدار البطاقة
            </Button>
            <Button variant="outline" onClick={() => setCardDialogOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md border border-[#e8e6e1] bg-[#FEFFFE] p-1.5">
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      <div className="text-xs font-medium truncate" title={String(value ?? "")}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function EditField({
  label,
  children,
  className,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-white border border-[#e8e6e1] p-1.5 space-y-1 ${className || ""}`}
    >
      <div
        dir="rtl"
        className="flex flex-row items-center justify-start gap-1 text-[10px] text-[#234E45] font-semibold leading-tight text-right"
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {children}
    </div>
  );
}

function StatusPill({
  label,
  icon,
  bg,
  active,
  onClick,
  labelColor,
  centered,
}: {
  label: string;
  icon: React.ReactNode;
  bg: string;
  active: boolean;
  onClick: () => void;
  labelColor?: string;
  centered?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center ${centered ? "justify-center" : "justify-between"} gap-2 h-10 rounded-xl border border-[#e8e6e1] ${bg} px-1.5 py-1.5 transition-all hover:shadow-sm`}
    >
      <span
        dir="rtl"
        className={`${centered ? "" : "min-w-0 flex-1"} text-[9px] font-bold whitespace-nowrap flex items-center ${centered ? "justify-center" : "justify-start"} gap-1 text-center ${labelColor || "text-[#234E45]"}`}
      >
        {icon}
        <span>{label}</span>
      </span>
      <span
        className={`shrink-0 text-[8px] leading-none font-bold rounded px-1 py-0.5 border flex items-center gap-0.5 ${
          active
            ? "bg-[#DCFCE7] text-[#16A34A] border-[#86EFAC]"
            : "bg-[#F3F4F6] text-[#9CA3AF] border-[#E5E7EB]"
        }`}
      >
        {active ? "✓ YES" : "✕ NO"}
      </span>
    </button>
  );
}

function YesNoPill({
  label,
  icon,
  tone,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  tone: "green" | "red" | "purple";
  value: "yes" | "no" | null;
  onChange: (v: "yes" | "no") => void;
}) {
  const toneMap = {
    green: { bgYes: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", yesBtn: "bg-emerald-100 text-emerald-700 border-emerald-300", noBtn: "bg-gray-100 text-gray-500 border-gray-200" },
    red: { bgYes: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", yesBtn: "bg-rose-100 text-rose-700 border-rose-300", noBtn: "bg-gray-100 text-gray-500 border-gray-200" },
    purple: { bgYes: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", yesBtn: "bg-violet-100 text-violet-700 border-violet-300", noBtn: "bg-gray-100 text-gray-500 border-gray-200" },
  } as const;
  const t = toneMap[tone];
  const cardBg = value === "yes" ? t.bgYes : "bg-white";
  const cardOpacity = value === "no" ? "opacity-60" : "";
  return (
    <div className={`rounded-xl border ${t.border} ${cardBg} ${cardOpacity} p-1.5 flex flex-col gap-1.5 transition-all`}>
      <div dir="rtl" className={`flex items-center justify-start gap-1 text-[10px] font-bold ${t.text}`}>
        <span className="truncate">{label}</span>
        {icon}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onChange("yes")}
          className={`h-6 rounded-md border text-[10px] font-bold transition-all ${value === "yes" ? t.yesBtn : "bg-white text-gray-400 border-gray-200"}`}
        >
          YES ✓
        </button>
        <button
          type="button"
          onClick={() => onChange("no")}
          className={`h-6 rounded-md border text-[10px] font-bold transition-all ${value === "no" ? "bg-gray-200 text-gray-600 border-gray-300" : "bg-white text-gray-400 border-gray-200"}`}
        >
          NO ✕
        </button>
      </div>
    </div>
  );
}

const DISCOUNT_RATES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

function DualCalculators({
  debtAmount,
  freezeDate,
}: {
  debtAmount: number;
  freezeDate: string;
}) {
  const [rate, setRate] = useState<number>(25);
  const [extraApplied, setExtraApplied] = useState<boolean>(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const days = useMemo(() => {
    if (!freezeDate) return 0;
    const fd = new Date(freezeDate);
    if (isNaN(fd.getTime())) return 0;
    return Math.max(0, Math.floor((today.getTime() - fd.getTime()) / (1000 * 60 * 60 * 24)));
  }, [freezeDate, today]);

  const years = days / 365;
  const discountAmount = debtAmount * (rate / 100);
  const settlementAmount = debtAmount - discountAmount;

  const addExtra = () => {
    if (extraApplied) return;
    const next = Math.min(rate + 5, 80);
    setRate(next);
    setExtraApplied(true);
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="grid grid-cols-2 gap-2" dir="rtl">
      {/* حاسبة التاريخ — يمين */}
      <div className="rounded-xl border border-[#e8e6e1] bg-white p-2 space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#234E45] pb-1 border-b border-dashed border-[#e8e6e1]">
          <Calendar className="size-3.5" />
          <span>حاسبة التاريخ</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#5a6b63] text-right">تاريخ التجميد</div>
            <div className="h-7 rounded-md bg-[#FAFAFA] border border-[#e8e6e1] text-[10px] tabular-nums flex items-center justify-center font-semibold">
              {freezeDate || "—"}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#5a6b63] text-right">تاريخ اليوم (ثابت)</div>
            <div className="h-7 rounded-md bg-[#FAFAFA] border border-[#e8e6e1] text-[10px] tabular-nums flex items-center justify-center font-semibold">
              {todayStr}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#5a6b63] text-right">عدد أيام التأخير</div>
            <div className="h-7 rounded-md bg-[#FAFAFA] border border-[#e8e6e1] text-[10px] tabular-nums flex items-center justify-center font-bold text-[#234E45]">
              {days || "—"}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#5a6b63] text-right">عدد السنوات</div>
            <div className="h-7 rounded-md bg-[#FAFAFA] border border-[#e8e6e1] text-[10px] tabular-nums flex items-center justify-center font-bold text-[#234E45]">
              {years ? years.toFixed(2) : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* حاسبة الخصم — يسار */}
      <div className="rounded-xl border border-[#e8e6e1] bg-white p-2 space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#7B3FE4] pb-1 border-b border-dashed border-[#e8e6e1]">
          <Calculator className="size-3.5" />
          <span>حاسبة الخصم</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#5a6b63] text-right">المبلغ</div>
            <div className="h-7 rounded-md bg-[#FAFAFA] border border-[#e8e6e1] text-[10px] tabular-nums flex items-center justify-center font-semibold">
              {fmt(debtAmount)} SAR
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#5a6b63] text-right">نسبة الخصم %</div>
            <Select value={String(rate)} onValueChange={(v) => { setRate(Number(v)); setExtraApplied(false); }}>
              <SelectTrigger className="h-7 text-[10px] text-center bg-white border border-[#e8e6e1] rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {DISCOUNT_RATES.map((r) => (
                  <SelectItem key={r} value={String(r)} className="text-[11px]">{r}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <button
          type="button"
          onClick={addExtra}
          disabled={extraApplied || rate >= 80}
          className="w-full h-7 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100 transition-colors"
        >
          + إضافة 5% خصم إضافي
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#5a6b63] text-right">مبلغ الخصم</div>
            <div className="h-7 rounded-md bg-[#FAFAFA] border border-[#e8e6e1] text-[10px] tabular-nums flex items-center justify-center font-bold text-[#E11D48]">
              {fmt(discountAmount)} SAR
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] text-[#5a6b63] text-right">مبلغ التسوية</div>
            <div className="h-7 rounded-md bg-[#FAFAFA] border border-[#e8e6e1] text-[10px] tabular-nums flex items-center justify-center font-bold text-[#0E8F4F]">
              {fmt(settlementAmount)} SAR
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
