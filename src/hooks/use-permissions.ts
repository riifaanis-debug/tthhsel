import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/components/LoginGate";

export type Permissions = {
  canView: boolean;
  canCalculate: boolean;
  canExport: boolean;
  canManage: boolean;
};

export type PermissionKey = keyof Permissions;

// Defaults preserve current UI behavior for collectors with no row in the table.
export const DEFAULT_COLLECTOR_PERMISSIONS: Permissions = {
  canView: true,
  canCalculate: true,
  canExport: true,
  canManage: false,
};

export const ADMIN_PERMISSIONS: Permissions = {
  canView: true,
  canCalculate: true,
  canExport: true,
  canManage: true,
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  canView: "البحث عن بيانات العملاء",
  canCalculate: "استخدام حاسبة الخصم",
  canExport: "تصدير البيانات",
  canManage: "إدارة البيانات (رفع/تعديل/حذف)",
};

type Row = {
  employee_id: string;
  can_view: boolean;
  can_calculate: boolean;
  can_export: boolean;
  can_manage: boolean;
};

function rowToPerms(r: Row | null): Permissions {
  if (!r) return DEFAULT_COLLECTOR_PERMISSIONS;
  return {
    canView: !!r.can_view,
    canCalculate: !!r.can_calculate,
    canExport: !!r.can_export,
    canManage: !!r.can_manage,
  };
}

export async function fetchAllPermissions(): Promise<Record<string, Permissions>> {
  const { data, error } = await supabase
    .from("collector_permissions")
    .select("employee_id, can_view, can_calculate, can_export, can_manage");
  if (error) throw error;
  const map: Record<string, Permissions> = {};
  for (const r of (data || []) as Row[]) map[r.employee_id] = rowToPerms(r);
  return map;
}

export async function upsertPermissions(
  employeeId: string,
  perms: Permissions,
  updatedBy?: string,
): Promise<void> {
  const { error } = await supabase.from("collector_permissions").upsert(
    {
      employee_id: employeeId,
      can_view: perms.canView,
      can_calculate: perms.canCalculate,
      can_export: perms.canExport,
      can_manage: perms.canManage,
      updated_by: updatedBy ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id" },
  );
  if (error) throw error;
}

export function usePermissions(): Permissions & { loading: boolean } {
  const [state, setState] = useState<Permissions & { loading: boolean }>({
    ...DEFAULT_COLLECTOR_PERMISSIONS,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const session = getSession();
    if (!session) {
      setState({ ...DEFAULT_COLLECTOR_PERMISSIONS, loading: false });
      return;
    }
    if (session.role === "admin") {
      setState({ ...ADMIN_PERMISSIONS, loading: false });
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("collector_permissions")
        .select("employee_id, can_view, can_calculate, can_export, can_manage")
        .eq("employee_id", session.employeeId)
        .maybeSingle();
      if (cancelled) return;
      setState({ ...rowToPerms((data as Row) || null), loading: false });
    };
    void load();

    const channel = supabase
      .channel(`perm-${session.employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collector_permissions",
          filter: `employee_id=eq.${session.employeeId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}
