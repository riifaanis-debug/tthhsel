import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { lookupCustomer } from "@/lib/customer-lookup.functions";
import { ThirdPartyDialog } from "@/components/ThirdPartyDialog";
import { formatCurrency } from "@/lib/wallet-types";

export const Route = createFileRoute("/third-party")({
  head: () => ({
    meta: [
      { title: "إحالة العميل إلى طرف ثالث — التحصيل الذكي" },
      { name: "description", content: "تعبئة طلب إحالة عميل إلى طرف ثالث." },
    ],
  }),
  component: ThirdPartyPage,
});

function ThirdPartyPage() {
  const [nid, setNid] = useState("");
  const [busy, setBusy] = useState(false);
  const [customer, setCustomer] = useState<{ name: string; id: string; amount: number } | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const call = useServerFn(lookupCustomer);

  const onImport = async () => {
    const v = nid.trim();
    if (!v) {
      toast.error("أدخل رقم الهوية");
      return;
    }
    setBusy(true);
    try {
      const res = await call({ data: { by: "id", value: v } });
      if (!res.found) {
        toast.error("لا يوجد عميل بهذه الهوية");
        return;
      }
      setCustomer({
        name: res.customer.name,
        id: res.customer.nationalId,
        amount: res.customer.amount || 0,
      });
      setDialogOpen(true);
      toast.success("تم استيراد بيانات العميل");
    } catch (e: any) {
      toast.error(e?.message || "تعذر الاستيراد");
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
          <h1 className="text-base font-bold flex-1">إحالة العميل إلى طرف ثالث</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold">رقم هوية العميل</label>
            <Input
              value={nid}
              inputMode="numeric"
              onChange={(e) => setNid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onImport();
              }}
              placeholder="1xxxxxxxxx"
              className="h-10 tabular-nums text-right"
            />
          </div>
          <Button onClick={onImport} disabled={busy} className="w-full h-10 gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            استيراد بيانات العميل
          </Button>
          {customer && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <div>
                <span className="font-semibold">الاسم: </span>
                {customer.name || "—"}
              </div>
              <div>
                <span className="font-semibold">الهوية: </span>
                {customer.id || "—"}
              </div>
              <div>
                <span className="font-semibold">مبلغ المديونية: </span>
                {formatCurrency(customer.amount)} SAR
              </div>
              <Button size="sm" className="mt-2 w-full" onClick={() => setDialogOpen(true)}>
                فتح نموذج الإحالة
              </Button>
            </div>
          )}
        </Card>
      </main>

      {customer && (
        <ThirdPartyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          customerName={customer.name}
          customerId={customer.id}
          settlementAmount={customer.amount}
        />
      )}
      <Toaster position="top-center" richColors />
    </div>
  );
}
