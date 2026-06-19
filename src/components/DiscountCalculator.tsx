import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Settings,
  RotateCcw,
  Printer,
  Copy,
  Download,
  Lock,
  Save,
  FileUp,
  FileDown,
  Plus,
  ArrowRight,
  Search,
  Loader2,
  FileImage,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { lookupCustomer } from "@/lib/customer-lookup.functions";
import { getSession } from "@/components/LoginGate";
import {
  DEFAULT_POLICY,
  AGE_LABELS,
  PF_CC_BUCKETS,
  AL_BUCKETS,
  loadPolicies,
  savePolicies,
  loadActiveId,
  saveActiveId,
  computeDebtAge,
  ageBucketFor,
  getDiscountRate,
  policyId,
  formatSAR,
  isEarlyPayEligible,
  type DiscountPolicy,
  type ProductType,
  type CaseStatus,
  type CarStatus,
  type AgeBucket,
} from "@/lib/discount-policy";

type ExtraProduct = {
  id: string;
  product: ProductType;
  caseStatus: CaseStatus;
  carStatus: CarStatus;
  balance: string;
};

const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export default function DiscountCalculator() {
  // === بيانات العميل ===
  const [name, setName] = useState("");
  const [idNo, setIdNo] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [phone, setPhone] = useState("");
  const [product, setProduct] = useState<ProductType>("PF");
  const [caseStatus, setCaseStatus] = useState<CaseStatus>("no_case");
  const [caseNo, setCaseNo] = useState<string>("");
  const [carStatus, setCarStatus] = useState<CarStatus>("with_client");
  const [defaultDate, setDefaultDate] = useState(""); // تاريخ التعثر / التجميد
  const [todayDate, setTodayDate] = useState(new Date().toISOString().slice(0, 10));
  const [balance, setBalance] = useState<string>("");

  // مزامنة حالة القضية مع رقم القضية
  useEffect(() => {
    setCaseStatus(caseNo.trim() ? "with_case" : "no_case");
  }, [caseNo]);

  // تنسيق الرصيد بفواصل عشرية
  const formatBalance = (v: string) => {
    const cleaned = v.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const intPart = parts[0] ? Number(parts[0]).toLocaleString("en-US") : "";
    return parts.length > 1 ? `${intPart}.${parts.slice(1).join("")}` : intPart;
  };
  const [clientOption, setClientOption] = useState<"none" | "senior60" | "finalExit" | "combined">(
    "none",
  );
  const isSenior60 = clientOption === "senior60";
  const finalExit = clientOption === "finalExit";
  const combinedMode = clientOption === "combined";
  const [earlyPay, setEarlyPay] = useState(false);
  const [extras, setExtras] = useState<ExtraProduct[]>([]);

  // === بحث العميل ===
  const [lookupBy, setLookupBy] = useState<"id" | "account">("id");
  const [lookupValue, setLookupValue] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [locked, setLocked] = useState(false);
  const lookupCustomerFn = useServerFn(lookupCustomer);

  const doLookup = async () => {
    const v = lookupValue.trim();
    if (!v) return toast.error("أدخل رقم الهوية أو رقم الحساب");
    setLookingUp(true);
    try {
      const res = await lookupCustomerFn({ data: { by: lookupBy, value: v } });
      if (!res.found) {
        toast.error("لم يتم العثور على العميل");
        return;
      }
      const c = res.customer;
      setName(c.name);
      setIdNo(c.nationalId);
      setAccountNo(c.accountNumber);
      setPhone((c as any).phone || "");
      if (c.product === "PF" || c.product === "CC" || c.product === "AL") {
        setProduct(c.product as ProductType);
      }
      setBalance(formatBalance(String(c.amount || "")));
      setCaseNo((c as any).caseNo || "");
      if ((c as any).freezeDate) setDefaultDate((c as any).freezeDate);
      setLocked(true);
      toast.success("تم استيراد بيانات العميل");
    } catch (e: any) {
      toast.error(e?.message || "تعذر استيراد البيانات");
    } finally {
      setLookingUp(false);
    }
  };

  const clearLookup = () => {
    setLocked(false);
    setLookupValue("");
    setName("");
    setIdNo("");
    setAccountNo("");
    setPhone("");
    setBalance("");
    setCaseNo("");
  };

  // === السياسات ===
  const [policies, setPolicies] = useState<Record<string, DiscountPolicy>>({});
  const [activeId, setActiveId] = useState<string>(policyId(DEFAULT_POLICY));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");

  useEffect(() => {
    setPolicies(loadPolicies());
    setActiveId(loadActiveId());
  }, []);

  const activePolicy: DiscountPolicy = policies[activeId] || DEFAULT_POLICY;

  // === حساب عمر الدين ===
  const debtAge = useMemo(() => {
    if (!defaultDate || !todayDate) return { days: 0, years: 0 };
    return computeDebtAge(defaultDate, todayDate);
  }, [defaultDate, todayDate]);

  const bucket: AgeBucket = useMemo(
    () => ageBucketFor(debtAge.years, product, { isSenior60, finalExit }),
    [debtAge.years, product, isSenior60, finalExit],
  );

  // أهلية السداد المبكر تلقائياً
  const earlyEligible = useMemo(
    () => isEarlyPayEligible(activePolicy, todayDate),
    [activePolicy, todayDate],
  );

  // === الحساب ===
  const result = useMemo(() => {
    const mainBal = parseFloat(balance.replace(/,/g, "")) || 0;
    if (!mainBal || !defaultDate) return null;
    const mainRate = getDiscountRate(activePolicy, product, caseStatus, carStatus, bucket);

    const extraRows = extras
      .map((x) => {
        const b = parseFloat((x.balance || "").replace(/,/g, "")) || 0;
        if (!b) return null;
        const xBucket = ageBucketFor(debtAge.years, x.product, { isSenior60, finalExit });
        const r = getDiscountRate(activePolicy, x.product, x.caseStatus, x.carStatus, xBucket);
        return { product: x.product, bal: b, rate: r };
      })
      .filter(Boolean) as { product: ProductType; bal: number; rate: number }[];

    const isCombined = extraRows.length > 0;
    const totalBal = mainBal + extraRows.reduce((s, r) => s + r.bal, 0);
    let effectiveRate = isCombined ? Math.max(mainRate, ...extraRows.map((r) => r.rate)) : mainRate;

    let earlyBonus = 0;
    if (earlyPay && activePolicy.earlyPay) {
      earlyBonus = totalBal * activePolicy.earlyPay.rate;
      effectiveRate += activePolicy.earlyPay.rate;
    }
    if (effectiveRate > 1) effectiveRate = 1;
    let discount = totalBal * effectiveRate;
    if (discount > totalBal) discount = totalBal;
    const settlement = Math.ceil((totalBal - discount) / 10) * 10;

    return {
      bal: totalBal,
      mainBal,
      rate: effectiveRate,
      discount,
      settlement,
      earlyBonus,
      isCombined,
      extraRows,
      mainRate,
    };
  }, [
    balance,
    defaultDate,
    activePolicy,
    product,
    caseStatus,
    carStatus,
    bucket,
    extras,
    debtAge.years,
    isSenior60,
    finalExit,
    earlyPay,
  ]);

  const reset = () => {
    setName("");
    setIdNo("");
    setAccountNo("");
    setPhone("");
    setProduct("PF");
    setCaseStatus("no_case");
    setCarStatus("with_client");
    setDefaultDate("");
    setBalance("");
    setCaseNo("");
    setClientOption("none");
    setEarlyPay(false);
    setExtras([]);
    setLocked(false);
    setLookupValue("");
  };

  const addExtra = () =>
    setExtras((xs) => [
      ...xs,
      {
        id: Math.random().toString(36).slice(2),
        product: "CC",
        caseStatus: "no_case",
        carStatus: "with_client",
        balance: "",
      },
    ]);
  const removeExtra = (id: string) => setExtras((xs) => xs.filter((x) => x.id !== id));
  const updateExtra = (id: string, patch: Partial<ExtraProduct>) =>
    setExtras((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const copySummary = async () => {
    if (!result) return toast.error("أدخل البيانات أولاً");
    const text = [
      `ملخص التسوية`,
      `العميل: ${name || "—"}`,
      `الهوية: ${idNo || "—"}`,
      `رقم الحساب: ${accountNo || "—"}`,
      `المنتج: ${product}`,
      `حالة القضية: ${caseStatus === "no_case" ? "بدون قضية" : "بوجود قضية"}`,
      product === "AL"
        ? `حالة السيارة: ${carStatus === "with_client" ? "مع العميل" : "مسحوبة"}`
        : "",
      `عمر الدين: ${AGE_LABELS[bucket]} (${debtAge.days.toLocaleString("en-US")} يوم)`,
      `نسبة الخصم: ${(result.rate * 100).toFixed(0)}%`,
      `الرصيد القائم: ${formatSAR(result.bal)} ر.س`,
      `مبلغ الخصم: ${formatSAR(result.discount)} ر.س`,
      `مبلغ التسوية: ${formatSAR(result.settlement)} ر.س`,
      `السياسة: ${MONTHS_AR[activePolicy.month - 1]} ${activePolicy.year}`,
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("تم نسخ الملخص");
  };

  const handlePrint = () => {
    if (!result) return toast.error("أدخل البيانات أولاً");
    const productLabel =
      product === "PF"
        ? "التمويل الشخصي"
        : product === "CC"
          ? "البطاقات الائتمانية"
          : "التمويل التأجيري";
    const firstLast = (() => {
      const parts = (name || "").trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return "—";
      if (parts.length === 1) return parts[0];
      return `${parts[0]} ${parts[parts.length - 1]}`;
    })();
    const rows: { k: string; v: string; cls?: string }[] = [
      { k: "اسم العميل", v: name || "—" },
      { k: "رقم الهوية الوطنية", v: idNo || "—", cls: "blue" },
      { k: "نوع المنتج", v: productLabel },
      { k: "رقم حساب التمويل", v: accountNo || "—", cls: "blue" },
      { k: "رقم طلب التنفيذ", v: caseNo || "—" },
      { k: "نسبة الخصم الممنوحة للعميل", v: `${(result.rate * 100).toFixed(0)}%` },
      { k: "رصيد حساب التمويل", v: `${formatSAR(result.bal)} ر.س` },
      { k: "مبلغ الخصم", v: `${formatSAR(result.discount)} ر.س` },
      { k: "مبلغ التسوية النهائية بعد الخصم", v: `${formatSAR(result.settlement)} ر.س` },
    ];
    const settlementText = `${formatSAR(result.settlement)} ر.س`;
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
<title>عرض تسوية وخصم مبدئي</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI','Tahoma',Arial,sans-serif;color:#1f2937;margin:32px;line-height:1.9;font-size:24px}
  h1{text-align:center;font-size:34px;margin:0 0 26px;padding:20px;border:2px solid #8AA98C;color:#5E7A66;border-radius:10px;background:#EFE7D9;font-weight:800}
  table{width:100%;border-collapse:collapse;margin:18px 0 22px;border:1px solid #C9C9C9}
  th,td{border:1px solid #C9C9C9;padding:16px 20px;font-size:24px}
  th{background:#EFE7D9;color:#5E7A66;width:42%;font-weight:800;text-align:right}
  td{text-align:center;background:#fff;color:#111;text-decoration:none}
  td.blue{color:#111;font-weight:600;text-decoration:none}
  .letter{margin-top:22px;font-size:24px;border:1px solid #d6d3c9;border-radius:10px;padding:24px 26px;background:#F7F4EC;line-height:2}
  .letter p{margin:10px 0}
  .amount{color:#9a6b1f;font-weight:800}
  .footer{margin-top:24px;font-size:14px;text-align:center;color:#6b7280;border-top:1px dashed #d1d5db;padding-top:10px}
  @media print{body{margin:14mm}}
</style></head><body>
<h1>عرض تسوية وخصم مبدئي</h1>
<div class="letter">
  <p><strong>عميلنا العزيز / ${firstLast}</strong></p>
  <p>تحية طيبة وبعد،،،</p>
  <p>نفيدكم بأن عليكم التزاماً مالياً قائماً بإجمالي رصيد قدره (${formatSAR(result.bal)} ريال) لم يتم سداده حتى تاريخه.</p>
  <p>وعليه، فقد تم منحكم عرض تسوية وخصم استثنائي مقدم من البنك الأهلي السعودي وفقاً للبيانات الموضحة أدناه.</p>
</div>
<p style="text-align:center;font-weight:800;margin:12px 0 8px;font-size:24px;">جدول البيانات</p>
<table>
  <tbody>
    ${rows.map((r) => `<tr><th>${r.k}</th><td class="${r.cls ?? ""}">${r.v}</td></tr>`).join("")}
  </tbody>
</table>
<div class="letter">
  <p>وفي حال سداد مبلغ التسوية المعتمد، سيتم تزويدكم بمخالصة نهائية وإبراء ذمة، ولن تتم مطالبتكم بالمبلغ المتبقي، كما سيتم اتخاذ الإجراءات اللازمة لإنهاء السند التنفيذي وتحديث حالة الالتزام وفق الأنظمة المعتمدة.</p>
  <p><strong>ملاحظة هامة:</strong></p>
  <p>يسري هذا العرض لمدة (10) أيام من تاريخ اعتماده، ويُعد لاغياً تلقائياً بانتهاء المدة دون سداد مبلغ التسوية. كما أن البنك غير ملزم بتقديم أي عرض مماثل مستقبلاً، وسيتم الرجوع إلى أصل المديونية ومطالبتكم بكامل الرصيد المستحق.</p>
  <p>نأمل منكم الاستفادة من هذا العرض والتوجه إلى أقرب فرع للبنك الأهلي السعودي لاستكمال إجراءات التسوية والحصول على خطاب التسوية والخصم الرسمي المعتمد.</p>
</div>
<div class="footer">السياسة المستخدمة: ${MONTHS_AR[activePolicy.month - 1]} ${activePolicy.year}</div>
<script>window.onload=()=>{setTimeout(()=>{window.print();},300)};</script>
</body></html>`;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return toast.error("الرجاء السماح بالنوافذ المنبثقة");
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const tryOpenSettings = () => {
    setAuthUser("");
    setAuthPass("");
    setAuthOpen(true);
  };

  const submitAuth = () => {
    if (authUser === ADMIN_USER && authPass === ADMIN_PASS) {
      setAuthOpen(false);
      setSettingsOpen(true);
      toast.success("مرحباً بك في لوحة الإعدادات");
    } else {
      toast.error("بيانات الدخول غير صحيحة");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="رجوع">
            <Link to="/">
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground grid place-items-center shadow-md">
            <Calculator className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">حاسبة الخصم</h1>
            <p className="text-xs text-muted-foreground">
              السياسة النشطة: {MONTHS_AR[activePolicy.month - 1]} {activePolicy.year}
            </p>
          </div>
          {getSession()?.role === "admin" && (
            <Button variant="outline" size="sm" onClick={tryOpenSettings} className="gap-1">
              <Lock className="size-4" /> إدارة سياسة الخصم
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 space-y-5 print:p-0">
        {/* بيانات العميل */}
        <Card className="p-4 space-y-3 print:hidden">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            بيانات العميل
          </h2>

          {/* بحث العميل */}
          <div className="grid grid-cols-[120px_1fr_auto] gap-2 items-end">
            <Field label="نوع البحث">
              <Select value={lookupBy} onValueChange={(v) => setLookupBy(v as "id" | "account")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">رقم الهوية</SelectItem>
                  <SelectItem value="account">رقم الحساب</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={lookupBy === "id" ? "رقم الهوية" : "رقم الحساب"}>
              <Input
                className="h-8 text-sm"
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value.replace(/[^\d]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doLookup();
                }}
                inputMode="numeric"
                placeholder={lookupBy === "id" ? "1xxxxxxxxx" : "—"}
                disabled={locked}
              />
            </Field>
            {locked ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={clearLookup}
              >
                تغيير
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1"
                onClick={doLookup}
                disabled={lookingUp}
              >
                {lookingUp ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                استيراد
              </Button>
            )}
          </div>

          {/* اسم العميل + رقم الحساب */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="اسم العميل">
              <Input
                className="h-8 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
                readOnly={locked}
              />
            </Field>
            <Field label="رقم الحساب">
              <Input
                className="h-8 text-sm"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="—"
                inputMode="numeric"
                readOnly={locked}
              />
            </Field>
          </div>

          {/* صف: نوع المنتج / رقم الهوية / حالة القضية */}
          <div className="grid grid-cols-3 gap-2">
            <Field label="نوع المنتج">
              <Select
                value={product}
                onValueChange={(v) => setProduct(v as ProductType)}
                disabled={locked}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">PF</SelectItem>
                  <SelectItem value="CC">CC</SelectItem>
                  <SelectItem value="AL">AL</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="رقم الهوية">
              <Input
                className="h-8 text-sm"
                value={idNo}
                onChange={(e) => setIdNo(e.target.value)}
                placeholder="1xxxxxxxxx"
                inputMode="numeric"
                readOnly={locked}
              />
            </Field>
            {product !== "AL" ? (
              <Field label={caseNo.trim() ? "حالة القضية: يوجد قضية" : "حالة القضية"}>
                <Input
                  className="h-8 text-sm"
                  value={caseNo}
                  onChange={(e) => setCaseNo(e.target.value)}
                  placeholder="رقم القضية (اختياري)"
                />
              </Field>
            ) : (
              <Field label="حالة السيارة">
                <Select value={carStatus} onValueChange={(v) => setCarStatus(v as CarStatus)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="with_client">مع العميل</SelectItem>
                    <SelectItem value="repossessed">مسحوبة</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          {/* صف: تاريخ التعثر (محسوب من JWO_DT − 3 أشهر) / تاريخ اليوم */}
          <div className="grid grid-cols-2 gap-2 overflow-hidden">
            <Field label="تاريخ التعثر / التجميد">
              <Input
                value={defaultDate || ""}
                readOnly
                inputMode="none"
                onFocus={(e) => e.currentTarget.blur()}
                title="محسوب تلقائياً من JWO_DT − 3 أشهر"
                className="h-8 w-full min-w-0 max-w-full px-1 text-center text-xs tabular-nums cursor-default"
                dir="ltr"
              />
            </Field>

            <Field label="تاريخ اليوم">
              <Input
                className="h-8 w-full min-w-0 max-w-full px-1 text-center text-xs tabular-nums"
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={todayDate}
                onChange={(e) => setTodayDate(e.target.value)}
              />
            </Field>
          </div>

          {/* ثلاثة خيارات: +60 / خروج نهائي / تسوية مشتركة */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: "senior60", label: "العمر +60 سنة" },
                { v: "finalExit", label: "خروج نهائي" },
                { v: "combined", label: "تسوية مشتركة" },
              ] as const
            ).map((o) => (
              <Button
                key={o.v}
                type="button"
                variant={clientOption === o.v ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setClientOption((cur) => (cur === o.v ? "none" : o.v))}
              >
                {o.label}
              </Button>
            ))}
          </div>

          {/* الرصيد + خصم السداد المبكر */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
            <Field label="الرصيد القائم (ر.س)">
              <Input
                className="h-8 text-sm"
                value={balance}
                onChange={(e) => setBalance(formatBalance(e.target.value))}
                placeholder="0.00"
                inputMode="decimal"
                readOnly={locked}
              />
            </Field>
            {activePolicy.earlyPay && (
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={earlyPay} onCheckedChange={setEarlyPay} />
                إضافة خصم {Math.round(activePolicy.earlyPay.rate * 100)}% إضافي
              </label>
            )}
          </div>

          {/* منتجات إضافية للتسوية المشتركة */}
          {combinedMode && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">منتجات إضافية للتسوية المشتركة</h3>
                <Button onClick={addExtra} size="sm" variant="outline" className="gap-1">
                  <Plus className="size-4" /> إضافة منتج
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                عند تسوية أكثر من منتج معاً تُطبَّق أعلى نسبة خصم على إجمالي الأرصدة.
              </p>
              {extras.map((x) => (
                <div
                  key={x.id}
                  className="grid md:grid-cols-4 gap-2 items-end rounded-lg border bg-muted/30 p-2"
                >
                  <Field label="المنتج">
                    <Select
                      value={x.product}
                      onValueChange={(v) => updateExtra(x.id, { product: v as ProductType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PF">PF</SelectItem>
                        <SelectItem value="CC">CC</SelectItem>
                        <SelectItem value="AL">AL</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {x.product !== "AL" ? (
                    <Field label="حالة القضية">
                      <Select
                        value={x.caseStatus}
                        onValueChange={(v) => updateExtra(x.id, { caseStatus: v as CaseStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_case">بدون قضية</SelectItem>
                          <SelectItem value="with_case">بوجود قضية</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  ) : (
                    <Field label="حالة السيارة">
                      <Select
                        value={x.carStatus}
                        onValueChange={(v) => updateExtra(x.id, { carStatus: v as CarStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="with_client">مع العميل</SelectItem>
                          <SelectItem value="repossessed">مسحوبة</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field label="الرصيد (ر.س)">
                    <Input
                      value={x.balance}
                      inputMode="decimal"
                      placeholder="0.00"
                      onChange={(e) =>
                        updateExtra(x.id, { balance: e.target.value.replace(/[^\d.,]/g, "") })
                      }
                    />
                  </Field>
                  <Button variant="outline" size="sm" onClick={() => removeExtra(x.id)}>
                    حذف
                  </Button>
                </div>
              ))}
            </div>
          )}

          {defaultDate && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">عدد الأيام: {debtAge.days.toLocaleString("en-US")}</Badge>
              <Badge variant="secondary">عدد السنوات: {debtAge.years.toFixed(2)}</Badge>
              <Badge>الفئة: {AGE_LABELS[bucket]}</Badge>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={reset} variant="outline" size="sm" className="gap-1">
              <RotateCcw className="size-4" /> إعادة تعيين
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1">
              <Printer className="size-4" /> طباعة
            </Button>
            <Button onClick={copySummary} variant="outline" size="sm" className="gap-1">
              <Copy className="size-4" /> نسخ الملخص
            </Button>
          </div>
        </Card>

        {/* النتائج */}
        {result ? (
          <Card className="p-5 bg-gradient-to-br from-primary/5 via-background to-accent/10 border-primary/20">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              نتيجة التسوية
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              <ResultBox
                label="نسبة الخصم المعتمدة"
                value={`${(result.rate * 100).toFixed(0)}%`}
                big
                tone="primary"
              />
              <ResultBox
                label="مبلغ الخصم"
                value={`${formatSAR(result.discount)} ر.س`}
                tone="gold"
              />
              <ResultBox
                label="مبلغ التسوية النهائي"
                value={`${formatSAR(result.settlement)} ر.س`}
                big
                tone="success"
              />
              <ResultBox label="الرصيد قبل الخصم" value={`${formatSAR(result.bal)} ر.س`} />
              <ResultBox label="الرصيد بعد الخصم" value={`${formatSAR(result.settlement)} ر.س`} />
              <ResultBox
                label="السياسة المستخدمة"
                value={`${MONTHS_AR[activePolicy.month - 1]} ${activePolicy.year}`}
              />
            </div>

            {(result.isCombined || result.earlyBonus > 0) && (
              <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                {result.isCombined && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">تسوية مشتركة — طُبِّقت أعلى نسبة</Badge>
                    <Badge variant="outline">
                      المنتج الأساسي {product}: {(result.mainRate * 100).toFixed(0)}%
                    </Badge>
                    {result.extraRows.map((r, i) => (
                      <Badge key={i} variant="outline">
                        {r.product}: {(r.rate * 100).toFixed(0)}% — {formatSAR(r.bal)}
                      </Badge>
                    ))}
                  </div>
                )}
                {result.earlyBonus > 0 && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                    سداد مبكر: +{formatSAR(result.earlyBonus)} ر.س
                  </Badge>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t text-sm grid md:grid-cols-2 gap-2 text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">العميل:</span> {name || "—"}
              </div>
              <div>
                <span className="font-semibold text-foreground">المنتج:</span> {product}
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {product === "AL" ? "حالة السيارة:" : "حالة القضية:"}
                </span>{" "}
                {product === "AL"
                  ? carStatus === "with_client"
                    ? "السيارة مع العميل"
                    : "السيارة مسحوبة"
                  : caseStatus === "no_case"
                    ? "بدون قضية"
                    : "بوجود قضية"}
              </div>
              <div>
                <span className="font-semibold text-foreground">عمر الدين:</span>{" "}
                {AGE_LABELS[bucket]}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-center">
              <Button
                onClick={() => {
                  if (!result) return toast.error("أدخل البيانات أولاً");
                  const productLabel =
                    product === "PF"
                      ? "التمويل الشخصي"
                      : product === "CC"
                        ? "البطاقات الائتمانية"
                        : "التمويل التأجيري";
                  const payload = {
                    name,
                    idNo,
                    accountNo,
                    phone,
                    productLabel,
                    rate: result.rate,
                    bal: result.bal,
                    discount: result.discount,
                    settlement: result.settlement,
                  };
                  const json = JSON.stringify(payload);
                  sessionStorage.setItem("discountCard:data", json);
                  const encoded = btoa(unescape(encodeURIComponent(json)));
                  window.open(`/discount-card#d=${encoded}`, "_blank");
                }}
                size="lg"
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <FileImage className="size-5" /> إصدار بطاقة خصم وتسوية مبدئي
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            أدخل تاريخ التعثر والرصيد القائم لعرض نتيجة التسوية.
          </Card>
        )}
      </main>

      {/* نافذة المصادقة */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل دخول إدارة سياسة الخصم</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="اسم المستخدم">
              <Input value={authUser} onChange={(e) => setAuthUser(e.target.value)} />
            </Field>
            <Field label="كلمة المرور">
              <Input
                type="password"
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAuth()}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitAuth}>دخول</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* لوحة الإعدادات */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5" /> إعدادات سياسة الخصم
            </DialogTitle>
          </DialogHeader>
          <PolicySettings
            policies={policies}
            activeId={activeId}
            onChange={(p, a) => {
              setPolicies(p);
              savePolicies(p);
              if (a) {
                setActiveId(a);
                saveActiveId(a);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= مكونات مساعدة =============

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="text-xs font-medium text-muted-foreground block truncate">{label}</Label>
      {children}
    </div>
  );
}

function ResultBox({
  label,
  value,
  big,
  tone,
}: {
  label: string;
  value: string;
  big?: boolean;
  tone?: "primary" | "gold" | "success";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "gold"
        ? "text-[oklch(0.72_0.16_75)]"
        : tone === "success"
          ? "text-[oklch(0.55_0.16_150)]"
          : "text-foreground";
  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div className={`font-bold ${big ? "text-2xl" : "text-base"} ${toneCls}`}>{value}</div>
    </div>
  );
}

// ============= لوحة إعدادات السياسة =============

function PolicySettings({
  policies,
  activeId,
  onChange,
}: {
  policies: Record<string, DiscountPolicy>;
  activeId: string;
  onChange: (p: Record<string, DiscountPolicy>, activeId?: string) => void;
}) {
  const perms = usePermissions();
  const [selectedId, setSelectedId] = useState(activeId);
  const [draft, setDraft] = useState<DiscountPolicy>(policies[activeId] || DEFAULT_POLICY);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setDraft(policies[selectedId] || DEFAULT_POLICY);
  }, [selectedId, policies]);

  const updateRate = (
    section: "PF" | "CC" | "AL",
    sub: string,
    bucket: AgeBucket,
    valuePct: string,
  ) => {
    const num = parseFloat(valuePct);
    if (isNaN(num)) return;
    if (num < 0 || num > 100) {
      toast.error("النسبة يجب أن تكون بين 0 و 100");
      return;
    }
    setDraft((d) => {
      const copy = JSON.parse(JSON.stringify(d)) as DiscountPolicy;
      (copy as any)[section][sub][bucket] = num / 100;
      return copy;
    });
  };

  const updateEarlyPay = (patch: Partial<NonNullable<DiscountPolicy["earlyPay"]>>) => {
    setDraft((d) => ({
      ...d,
      earlyPay: { rate: 0.05, beforeDate: "", ...(d.earlyPay || {}), ...patch },
    }));
  };

  const save = () => {
    const id = policyId(draft);
    const next = { ...policies, [id]: draft };
    onChange(next, id);
    toast.success("تم حفظ السياسة بنجاح");
  };

  const activate = () => {
    onChange(policies, selectedId);
    toast.success("تم تفعيل السياسة");
  };

  const restore = () => {
    if (!confirm("استعادة السياسة الافتراضية لهذا الشهر؟")) return;
    setDraft(JSON.parse(JSON.stringify(DEFAULT_POLICY)));
    toast.success("تم استعادة الإعدادات الافتراضية");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discount-policy-${policyId(draft)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const parsed = JSON.parse(String(fr.result)) as DiscountPolicy;
        if (!parsed.month || !parsed.year || !parsed.PF || !parsed.CC || !parsed.AL)
          throw new Error("ملف غير صالح");
        setDraft(parsed);
        toast.success("تم استيراد السياسة، اضغط حفظ لتأكيدها");
      } catch (e: any) {
        toast.error("ملف غير صالح: " + (e?.message || ""));
      }
    };
    fr.readAsText(file);
  };

  const addNewPolicy = () => {
    const id = policyId({ month: newMonth, year: newYear });
    if (policies[id]) {
      setSelectedId(id);
      toast.info("هذه السياسة موجودة بالفعل");
      return;
    }
    const fresh: DiscountPolicy = {
      ...JSON.parse(JSON.stringify(DEFAULT_POLICY)),
      month: newMonth,
      year: newYear,
    };
    const next = { ...policies, [id]: fresh };
    onChange(next);
    setSelectedId(id);
    toast.success("تم إنشاء سياسة جديدة");
  };

  return (
    <div className="space-y-4">
      {/* اختيار السياسة */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="السياسة">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(policies).map((p) => (
                <SelectItem key={policyId(p)} value={policyId(p)}>
                  {MONTHS_AR[p.month - 1]} {p.year} {policyId(p) === activeId ? " (نشطة)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-end gap-2">
          <Field label="شهر جديد">
            <Select value={String(newMonth)} onValueChange={(v) => setNewMonth(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_AR.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="السنة">
            <Input
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
              className="w-24"
            />
          </Field>
          <Button onClick={addNewPolicy} size="sm" variant="outline" className="gap-1">
            <Plus className="size-4" /> إضافة
          </Button>
        </div>
      </div>

      {/* جداول التعديل */}
      <Tabs defaultValue="pf">
        <TabsList>
          <TabsTrigger value="pf">PF</TabsTrigger>
          <TabsTrigger value="cc">CC</TabsTrigger>
          <TabsTrigger value="al">AL</TabsTrigger>
          <TabsTrigger value="early">السداد المبكر</TabsTrigger>
        </TabsList>

        <TabsContent value="pf" className="space-y-4">
          <RateTable
            title="بدون قضية"
            buckets={PF_CC_BUCKETS}
            values={draft.PF.no_case}
            onChange={(b, v) => updateRate("PF", "no_case", b, v)}
          />
          <RateTable
            title="بوجود قضية"
            buckets={PF_CC_BUCKETS}
            values={draft.PF.with_case}
            onChange={(b, v) => updateRate("PF", "with_case", b, v)}
          />
        </TabsContent>

        <TabsContent value="cc" className="space-y-4">
          <RateTable
            title="بدون قضية"
            buckets={PF_CC_BUCKETS}
            values={draft.CC.no_case}
            onChange={(b, v) => updateRate("CC", "no_case", b, v)}
          />
          <RateTable
            title="بوجود قضية"
            buckets={PF_CC_BUCKETS}
            values={draft.CC.with_case}
            onChange={(b, v) => updateRate("CC", "with_case", b, v)}
          />
        </TabsContent>

        <TabsContent value="al" className="space-y-4">
          <RateTable
            title="السيارة مع العميل"
            buckets={AL_BUCKETS}
            values={draft.AL.with_client}
            onChange={(b, v) => updateRate("AL", "with_client", b, v)}
          />
          <RateTable
            title="السيارة مسحوبة"
            buckets={AL_BUCKETS}
            values={draft.AL.repossessed}
            onChange={(b, v) => updateRate("AL", "repossessed", b, v)}
          />
        </TabsContent>

        <TabsContent value="early" className="space-y-3">
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm">خصم السداد المبكر</h3>
            <p className="text-xs text-muted-foreground">
              يضاف كنسبة إضافية على إجمالي الخصم إذا تمّ السداد قبل التاريخ المحدد.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="النسبة (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.earlyPay ? Math.round(draft.earlyPay.rate * 100) : ""}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    if (!isNaN(n)) updateEarlyPay({ rate: n / 100 });
                  }}
                />
              </Field>
              <Field label="ساري حتى تاريخ">
                <Input
                  type="date"
                  value={draft.earlyPay?.beforeDate || ""}
                  onChange={(e) => updateEarlyPay({ beforeDate: e.target.value })}
                />
              </Field>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* الأزرار */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button onClick={save} className="gap-1">
          <Save className="size-4" /> حفظ السياسة
        </Button>
        <Button onClick={activate} variant="outline" className="gap-1">
          تفعيل السياسة
        </Button>
        <Button onClick={restore} variant="outline" className="gap-1">
          <RotateCcw className="size-4" /> استعادة الافتراضي
        </Button>
        {perms.canExport && (
          <Button onClick={exportJson} variant="outline" className="gap-1">
            <FileDown className="size-4" /> تصدير JSON
          </Button>
        )}
        <label>
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
          <Button asChild variant="outline" className="gap-1 cursor-pointer">
            <span>
              <FileUp className="size-4" /> استيراد JSON
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}

function RateTable({
  title,
  buckets,
  values,
  onChange,
}: {
  title: string;
  buckets: AgeBucket[];
  values: Partial<Record<AgeBucket, number>>;
  onChange: (b: AgeBucket, v: string) => void;
}) {
  return (
    <Card className="p-3">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {buckets.map((b) => (
          <div key={b} className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{AGE_LABELS[b]}</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={values[b] != null ? Math.round((values[b] as number) * 100) : ""}
                onChange={(e) => onChange(b, e.target.value)}
                className="pl-7 text-center"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
