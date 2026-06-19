import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { lookupCustomer } from "@/lib/customer-lookup.functions";
import { formatCurrency } from "@/lib/wallet-types";
import { usePermissions } from "@/hooks/use-permissions";
import PermissionDenied from "@/components/PermissionDenied";

export const Route = createFileRoute("/lookup")({
  head: () => ({
    meta: [
      { title: "البحث عن حساب — التحصيل الذكي" },
      { name: "description", content: "البحث عن بيانات عميل برقم الحساب أو الهوية أو الجوال." },
    ],
  }),
  component: LookupPage,
});

type By = "account" | "id" | "phone";
type Result = Awaited<ReturnType<typeof lookupCustomer>>;

function LookupPage() {
  const perms = usePermissions();
  const [by, setBy] = useState<By>("account");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const call = useServerFn(lookupCustomer);

  if (!perms.loading && !perms.canView) {
    return <PermissionDenied message="لا تملك صلاحية البحث عن بيانات العملاء." />;
  }

  const labels: Record<By, string> = {
    account: "رقم الحساب",
    id: "رقم الهوية",
    phone: "رقم الجوال",
  };

  const onSearch = async () => {
    const v = value.trim();
    if (!v) {
      toast.error("أدخل قيمة البحث");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await call({ data: { by, value: v } });
      setResult(res);
      if (!res.found) toast.error("لا يوجد عميل بهذه البيانات");
    } catch (e: any) {
      toast.error(e?.message || "تعذر البحث");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <h1 className="text-base font-bold flex-1">البحث عن حساب</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold">نوع البحث</label>
            <Select
              value={by}
              onValueChange={(v) => {
                setBy(v as By);
                setValue("");
                setResult(null);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account">رقم الحساب</SelectItem>
                <SelectItem value="id">رقم الهوية</SelectItem>
                <SelectItem value="phone">رقم الجوال</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold">{labels[by]}</label>
            <Input
              value={value}
              inputMode="numeric"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
              placeholder={`أدخل ${labels[by]}`}
              className="h-10 tabular-nums text-right"
            />
          </div>
          <Button onClick={onSearch} disabled={busy} className="w-full h-10 gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            بحث
          </Button>
        </Card>

        {result?.found && (
          <Card className="p-0 overflow-hidden">
            <div className="bg-primary text-primary-foreground px-4 py-2 text-sm font-bold">
              بيانات العميل
            </div>
            <table className="w-full text-xs">
              <tbody>
                {(
                  [
                    ["اسم العميل", result.customer.name],
                    ["رقم الهوية", result.customer.nationalId],
                    ["رقم الحساب", result.customer.accountNumber],
                    ["رقم الجوال", result.customer.phone],
                    ["نوع المنتج", result.customer.product],
                    [
                      "مبلغ المديونية",
                      result.customer.amount ? `${formatCurrency(result.customer.amount)} SAR` : "",
                    ],
                    ["عمر الدين", result.customer.debtAge],
                    ["تقييم أعمال", result.customer.evaluation],
                    ["الاكشن", result.customer.action],
                    ["رقم القضية", result.customer.caseNo],
                    ["طلب سابق", result.customer.previousRequest],
                    ["عميل رواتب", result.customer.isSalary ? "نعم" : "لا"],
                    ["عميل متوفي", result.customer.isDeceased ? "نعم" : "لا"],
                    ["اسم المحصل", result.customer.agentName],
                  ] as const
                ).map(([k, v]) => (
                  <tr key={k} className="border-b last:border-0">
                    <th className="bg-muted/40 text-right px-3 py-2 font-semibold w-40 align-top">
                      {k}
                    </th>
                    <td className="px-3 py-2 select-text break-all">{v || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
