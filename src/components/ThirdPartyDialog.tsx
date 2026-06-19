import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/wallet-types";
import { KSA_REGIONS, REGION_NAMES } from "@/lib/ksa-regions";

const EMPLOYERS = ["قطاع حكومي", "قطاع خاص", "متقاعد"];

const RECIPIENT = "debt.coll.sys@gmail.com";

type AhliProduct = { account: string; settle: string; type: string };
type OtherBank = { bank: string; account: string; settle: string; type: string };

export function ThirdPartyDialog({
  open,
  onOpenChange,
  customerName,
  customerId,
  settlementAmount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerName: string;
  customerId: string;
  settlementAmount: number;
}) {
  const [salary, setSalary] = useState("");
  const [employer, setEmployer] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");

  const [hasAhli, setHasAhli] = useState(false);
  const [ahliList, setAhliList] = useState<AhliProduct[]>([{ account: "", settle: "", type: "" }]);

  const [hasOther, setHasOther] = useState(false);
  const [otherList, setOtherList] = useState<OtherBank[]>([
    { bank: "", account: "", settle: "", type: "" },
  ]);

  const [hasOblig, setHasOblig] = useState(false);
  const [obligAmount, setObligAmount] = useState("");

  const [salaryFile, setSalaryFile] = useState<File | null>(null);
  const [simahFile, setSimahFile] = useState<File | null>(null);
  const [najezFile, setNajezFile] = useState<File | null>(null);

  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);

  const totalDebt = useMemo(() => {
    let t = settlementAmount || 0;
    if (hasAhli) t += ahliList.reduce((s, a) => s + (Number(a.settle) || 0), 0);
    if (hasOther) t += otherList.reduce((s, o) => s + (Number(o.settle) || 0), 0);
    if (hasOblig) t += Number(obligAmount) || 0;
    return t;
  }, [settlementAmount, hasAhli, ahliList, hasOther, otherList, hasOblig, obligAmount]);

  const reset = () => {
    setSalary("");
    setEmployer("");
    setRegion("");
    setCity("");
    setHasAhli(false);
    setAhliList([{ account: "", settle: "", type: "" }]);
    setHasOther(false);
    setOtherList([{ bank: "", account: "", settle: "", type: "" }]);
    setHasOblig(false);
    setObligAmount("");
    setSalaryFile(null);
    setSimahFile(null);
    setNajezFile(null);
    setSubmitted(null);
  };

  const handleSubmit = () => {
    if (!salary.trim()) {
      toast.error("يرجى إدخال إجمالي الراتب");
      return;
    }
    if (!employer) {
      toast.error("يرجى اختيار جهة العمل");
      return;
    }
    if (!region || !city) {
      toast.error("يرجى اختيار المنطقة والمدينة");
      return;
    }
    const reqId = "TP-" + Date.now().toString(36).toUpperCase();
    const lines: string[] = [];
    lines.push(`رقم الطلب: ${reqId}`);
    lines.push(`اسم العميل: ${customerName}`);
    lines.push(`رقم الهوية: ${customerId}`);
    lines.push(`مبلغ التسوية: ${formatCurrency(settlementAmount)} SAR`);
    lines.push(`إجمالي الراتب: ${salary} SAR`);
    lines.push(`جهة العمل: ${employer}`);
    lines.push(`المنطقة: ${region}`);
    lines.push(`المدينة: ${city}`);
    lines.push("");
    lines.push("— منتجات لدى البنك الأهلي —");
    if (hasAhli) {
      ahliList.forEach((a, i) => {
        lines.push(
          `(${i + 1}) رقم الحساب: ${a.account} | مبلغ التسوية: ${a.settle} | نوع المنتج: ${a.type}`,
        );
      });
    } else lines.push("لا يوجد");
    lines.push("");
    lines.push("— مديونيات لدى بنوك أخرى —");
    if (hasOther) {
      otherList.forEach((o, i) => {
        lines.push(
          `(${i + 1}) الجهة: ${o.bank} | الحساب: ${o.account} | التسوية: ${o.settle} | النوع: ${o.type}`,
        );
      });
    } else lines.push("لا يوجد");
    lines.push("");
    lines.push(`— التزامات أخرى —`);
    lines.push(hasOblig ? `${obligAmount} SAR` : "لا يوجد");
    lines.push("");
    lines.push(`إجمالي المديونيات: ${formatCurrency(totalDebt)} SAR`);
    lines.push("");
    lines.push("— المستندات المرفقة —");
    lines.push(`تعريف بالراتب: ${salaryFile?.name || "—"}`);
    lines.push(`تقرير سمة: ${simahFile?.name || "—"}`);
    lines.push(`تقرير ناجز: ${najezFile?.name || "—"}`);

    const subject = encodeURIComponent(`طلب طرف ثالث - ${customerName} - ${reqId}`);
    const body = encodeURIComponent(lines.join("\n"));

    // Persist for admin inbox
    try {
      const KEY = "wallet:thirdparty:requests";
      const existing = JSON.parse(localStorage.getItem(KEY) || "[]");
      let session: any = null;
      try {
        session = JSON.parse(localStorage.getItem("wallet:session:v1") || "null");
      } catch {}
      existing.unshift({
        id: reqId,
        createdAt: new Date().toISOString(),
        status: "pending",
        customerName,
        customerId,
        settlementAmount,
        salary,
        employer,
        region,
        city,
        ahli: hasAhli ? ahliList : [],
        otherBanks: hasOther ? otherList : [],
        obligation: hasOblig ? Number(obligAmount) || 0 : 0,
        totalDebt,
        documents: {
          salary: salaryFile?.name || null,
          simah: simahFile?.name || null,
          najez: najezFile?.name || null,
        },
        collector: session
          ? { name: session.name, employeeId: session.employeeId, supervisor: session.supervisor }
          : null,
        body: lines.join("\n"),
      });
      localStorage.setItem(KEY, JSON.stringify(existing.slice(0, 500)));
    } catch {}

    window.open(`mailto:${RECIPIENT}?subject=${subject}&body=${body}`, "_blank");
    setSubmitted({ id: reqId });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">إرسال العميل إلى طرف ثالث</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="size-12 text-emerald-600 mx-auto" />
            <div className="text-sm font-medium">تم إرسال الطلب</div>
            <div className="text-xs text-muted-foreground">جاري البحث عن طرف ثالث مناسب</div>
            <Card className="p-3 mt-2">
              <div className="text-[10px] text-muted-foreground">رقم الطلب</div>
              <div className="text-base font-bold tabular-nums">{submitted.id}</div>
            </Card>
            <Button
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="w-full mt-3"
            >
              إغلاق
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <ReadField label="اسم العميل" value={customerName} />
              <ReadField label="رقم الهوية" value={customerId} />
              <ReadField
                label="مبلغ التسوية"
                value={`${formatCurrency(settlementAmount)} SAR`}
                className="col-span-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">إجمالي الراتب</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="h-8 text-xs tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">جهة العمل</Label>
                <Select value={employer} onValueChange={setEmployer}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYERS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">المنطقة</Label>
                <Select
                  value={region}
                  onValueChange={(v) => {
                    setRegion(v);
                    setCity("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="اختر المنطقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGION_NAMES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">المدينة</Label>
                <Select value={city} onValueChange={setCity} disabled={!region}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={region ? "اختر المدينة" : "اختر المنطقة أولاً"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(KSA_REGIONS[region] || []).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* الأهلي */}
            <Card className="p-2 space-y-2">
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">منتجات لدى البنك الأهلي؟</span>
                <Switch checked={hasAhli} onCheckedChange={setHasAhli} />
              </label>
              {hasAhli && (
                <div className="space-y-2">
                  {ahliList.map((a, i) => (
                    <div key={i} className="grid grid-cols-3 gap-1.5 items-end">
                      <Input
                        placeholder="رقم الحساب"
                        value={a.account}
                        onChange={(e) =>
                          setAhliList((p) =>
                            p.map((x, j) => (j === i ? { ...x, account: e.target.value } : x)),
                          )
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="مبلغ التسوية"
                        type="number"
                        inputMode="decimal"
                        value={a.settle}
                        onChange={(e) =>
                          setAhliList((p) =>
                            p.map((x, j) => (j === i ? { ...x, settle: e.target.value } : x)),
                          )
                        }
                        className="h-8 text-xs tabular-nums"
                      />
                      <div className="flex gap-1">
                        <Input
                          placeholder="نوع المنتج"
                          value={a.type}
                          onChange={(e) =>
                            setAhliList((p) =>
                              p.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)),
                            )
                          }
                          className="h-8 text-xs"
                        />
                        {ahliList.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setAhliList((p) => p.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() =>
                      setAhliList((p) => [...p, { account: "", settle: "", type: "" }])
                    }
                  >
                    <Plus className="size-3 ml-1" /> إضافة منتج
                  </Button>
                </div>
              )}
            </Card>

            {/* بنوك أخرى */}
            <Card className="p-2 space-y-2">
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">مديونيات لدى بنوك أخرى؟</span>
                <Switch checked={hasOther} onCheckedChange={setHasOther} />
              </label>
              {hasOther && (
                <div className="space-y-2">
                  {otherList.map((o, i) => (
                    <div key={i} className="grid grid-cols-2 gap-1.5">
                      <Input
                        placeholder="اسم الجهة"
                        value={o.bank}
                        onChange={(e) =>
                          setOtherList((p) =>
                            p.map((x, j) => (j === i ? { ...x, bank: e.target.value } : x)),
                          )
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="رقم الحساب"
                        value={o.account}
                        onChange={(e) =>
                          setOtherList((p) =>
                            p.map((x, j) => (j === i ? { ...x, account: e.target.value } : x)),
                          )
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="مبلغ التسوية"
                        type="number"
                        inputMode="decimal"
                        value={o.settle}
                        onChange={(e) =>
                          setOtherList((p) =>
                            p.map((x, j) => (j === i ? { ...x, settle: e.target.value } : x)),
                          )
                        }
                        className="h-8 text-xs tabular-nums"
                      />
                      <div className="flex gap-1">
                        <Input
                          placeholder="نوع المنتج"
                          value={o.type}
                          onChange={(e) =>
                            setOtherList((p) =>
                              p.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)),
                            )
                          }
                          className="h-8 text-xs"
                        />
                        {otherList.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setOtherList((p) => p.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() =>
                      setOtherList((p) => [...p, { bank: "", account: "", settle: "", type: "" }])
                    }
                  >
                    <Plus className="size-3 ml-1" /> إضافة جهة
                  </Button>
                </div>
              )}
            </Card>

            {/* التزامات */}
            <Card className="p-2 space-y-2">
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">التزامات أخرى؟</span>
                <Switch checked={hasOblig} onCheckedChange={setHasOblig} />
              </label>
              {hasOblig && (
                <Input
                  placeholder="مبلغ الالتزام"
                  type="number"
                  inputMode="decimal"
                  value={obligAmount}
                  onChange={(e) => setObligAmount(e.target.value)}
                  className="h-8 text-xs tabular-nums"
                />
              )}
            </Card>

            <Card className="p-3 bg-primary text-primary-foreground">
              <div className="text-[10px] opacity-80">إجمالي المديونيات على العميل</div>
              <div className="text-xl font-bold tabular-nums">{formatCurrency(totalDebt)} SAR</div>
            </Card>

            {/* مستندات */}
            <div className="space-y-2">
              <div className="text-xs font-semibold">المستندات</div>
              <FileField label="تعريف بالراتب حديث" file={salaryFile} onChange={setSalaryFile} />
              <FileField label="تقرير سمة" file={simahFile} onChange={setSimahFile} />
              <FileField label="تقرير ناجز" file={najezFile} onChange={setNajezFile} />
            </div>
          </div>
        )}

        {!submitted && (
          <DialogFooter>
            <Button onClick={handleSubmit} className="w-full">
              <Send className="size-4 ml-1" /> إرسال
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReadField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-md border p-1.5 ${className || ""}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xs font-medium truncate">{value || "—"}</div>
    </div>
  );
}

function FileField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {file?.name || "لم يتم الإرفاق"}
        </div>
      </div>
      <input
        type="file"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <span className="text-[11px] px-2 py-1 rounded bg-secondary">إرفاق</span>
    </label>
  );
}
