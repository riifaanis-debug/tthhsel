import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { freezeFromJwo, readJwo } from "./freeze-date";

const Input = z.object({
  by: z.enum(["id", "account", "phone"]),
  value: z.string().min(1).max(64),
});

export const lookupCustomer = createServerFn({ method: "POST" })
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const col =
      data.by === "id" ? "national_id" : data.by === "account" ? "account_number" : "phone";
    const value = data.value.trim();

    const { data: rows, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq(col, value)
      .limit(1);
    if (error) throw new Error(error.message);
    const cust = rows?.[0];
    if (!cust) return { found: false as const };

    const raw = (cust.raw as Record<string, any> | null) ?? null;

    const accountNumber = (cust.account_number as string) ?? "";
    const nationalId = (cust.national_id as string) ?? "";
    const customerName = (cust.customer_name as string) ?? "";

    // تاريخ التجميد is computed from JWO_DT - 3 months. Never trust the stored
    // freeze date and never trust manual customer_state edits for it.
    const jwo = readJwo(raw) ?? readJwo(cust);
    const freezeDate = freezeFromJwo(jwo);

    return {
      found: true as const,
      customer: {
        name: customerName,
        nationalId,
        accountNumber,
        phone: (cust.phone as string) ?? "",
        product: (cust.product as string) ?? "",
        amount: Number(cust.amount ?? 0),
        debtAge: (cust.debt_age as string) ?? "",
        action: (cust.action as string) ?? "",
        isSalary: Boolean(cust.is_salary),
        isDeceased: Boolean(cust.is_deceased),
        agentName: (raw?.["اسم المحصل"] as string) ?? "",
        evaluation: (raw?.["تقييم أعمال"] as string) ?? "",
        caseNo: (raw?.["رقم القضية"] as string) ?? "",
        previousRequest:
          (raw?.["رقم طلب سبيل"] as string) ?? (raw?.["رقم طلب سيبل"] as string) ?? "",
        freezeDate,
        raw,
      },
    };
  });
