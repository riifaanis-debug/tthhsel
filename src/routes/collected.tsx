import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWallet, useCustomerStates } from "@/lib/wallet-store";
import { customerKey, formatCurrency } from "@/lib/wallet-types";
import { getSession } from "@/components/LoginGate";
import { isOwnedByCollector } from "@/lib/wallet-predicates";

export const Route = createFileRoute("/collected")({
  head: () => ({
    meta: [
      { title: "إجمالي المحقق" },
      { name: "description", content: "عرض تفاصيل المبالغ المحصلة." },
    ],
  }),
  component: CollectedPage,
});

function CollectedPage() {
  const { customers: rawCustomers, hydrated } = useWallet();
  const { states } = useCustomerStates();

  const customers = useMemo(() => {
    const session = getSession();
    if (!session) return [];
    if (session.role === "collector") {
      return rawCustomers.filter((c) =>
        isOwnedByCollector(
          (c as any)["ID AGENT"] ??
            c["الرقم الوظيفي للمحصل"] ??
            (c as any)["agent_employee_id"],
          c["اسم المحصل"],
          session.employeeId,
          (session as any).name,
        ),
      );
    }
    return rawCustomers;
  }, [rawCustomers]);

  const collectedRows = useMemo(() => {
    const toNum = (v: unknown) => {
      if (v == null) return 0;
      const s = String(v).replace(/[^\d.\-]/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    };

    const rows: {
      key: string;
      account: string;
      name: string;
      product: string;
      amount: number;
      method: string;
    }[] = [];

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

      if (v > 0) {
        rows.push({
          key: k,
          account: c["رقم الحساب"] || "",
          name: c["اسم العميل"] || "",
          product: (c["نوع المنتج"] ?? c["المنتج"] ?? "") as string,
          amount: v,
          method:
            (st?.edits?.["نوع السداد"] as string) ||
            (st?.paymentType as string) ||
            "—",
        });
      }
    }

    return rows.sort((a, b) => b.amount - a.amount);
  }, [customers, states]);

  const total = useMemo(
    () => collectedRows.reduce((sum, r) => sum + r.amount, 0),
    [collectedRows],
  );

  if (!hydrated) {
    return (
      <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#133E35]">
            <Wallet className="size-4 text-primary" />
            <span className="font-bold text-sm">إجمالي المحقق</span>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1">
            <Link to="/">
              <ArrowRight className="size-4" />
              رجوع
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-bold text-[#133E35]">
            عدد العملاء: {collectedRows.length.toLocaleString("en-US")}
          </div>
          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
            {total.toLocaleString("en-US")}{" "}
            <span className="text-xs font-medium">SAR</span>
          </div>
        </div>

        <div className="border rounded-lg overflow-auto bg-white">
          {collectedRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              لا توجد مدفوعات مسجلة
            </div>
          ) : (
            <Table className="text-[11px]">
              <TableHeader className="bg-secondary">
                <TableRow>
                  <TableHead className="text-right font-bold text-[#133E35] whitespace-nowrap">
                    رقم الحساب
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#133E35] whitespace-nowrap">
                    اسم العميل
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#133E35] whitespace-nowrap">
                    نوع المنتج
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#133E35] whitespace-nowrap">
                    مبلغ السداد
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#133E35] whitespace-nowrap">
                    طريقة السداد
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collectedRows.map((row) => (
                  <TableRow key={row.key} className="hover:bg-muted/40">
                    <TableCell className="text-right tabular-nums">
                      {row.account || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.product || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-emerald-700">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.method || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
