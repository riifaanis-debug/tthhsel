import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_EMPLOYEE_ID = "666666";

const EmpInput = z.object({ employeeId: z.string() });

export const listWalletBackups = createServerFn({ method: "POST" })
  .inputValidator((input) => EmpInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("wallet_backups")
      .select("id, created_at, created_by, account_count, total_amount")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { backups: rows || [] };
  });

const IdInput = z.object({ employeeId: z.string(), backupId: z.string().uuid() });

export const getWalletBackup = createServerFn({ method: "POST" })
  .inputValidator((input) => IdInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("wallet_backups")
      .select("*")
      .eq("id", data.backupId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { backup: row };
  });

export const restoreWalletBackup = createServerFn({ method: "POST" })
  .inputValidator((input) => IdInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("restore_wallet_backup", { _backup_id: data.backupId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWalletBackup = createServerFn({ method: "POST" })
  .inputValidator((input) => IdInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("wallet_backups").delete().eq("id", data.backupId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
