import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WalletInput = z.object({
  role: z.string(),
  employeeId: z.string(),
  forceAll: z.boolean().optional(),
});

export const getWalletCustomers = createServerFn({ method: "POST" })
  .inputValidator((input) => WalletInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("customers")
      .select("*")
      .order("amount", { ascending: false })
      .limit(50000);

    if (data.role === "collector" && !data.forceAll) {
      query = query.eq("agent_employee_id", data.employeeId);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("Supabase query error in getWalletCustomers:", error);
      throw new Error(error.message);
    }
    return rows ?? [];
  });
