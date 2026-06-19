import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import collectors from "@/data/collectors.json";
import {
  DEFAULT_COLLECTOR_PERMISSIONS,
  PERMISSION_LABELS,
  fetchAllPermissions,
  upsertPermissions,
  type Permissions,
  type PermissionKey,
} from "@/hooks/use-permissions";
import { getSession } from "@/components/LoginGate";

type Collector = { supervisor: string; collector: string; employeeId: string };
const BASE = collectors as Collector[];

const KEYS: PermissionKey[] = ["canView", "canCalculate", "canExport", "canManage"];

export default function PermissionsPanel() {
  const [q, setQ] = useState("");
  const [map, setMap] = useState<Record<string, Permissions>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await fetchAllPermissions();
      setMap(data);
    } catch (e: any) {
      toast.error(e?.message || "تعذر تحميل الصلاحيات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const list = useMemo(() => {
    const t = q.trim();
    let arr = BASE;
    if (t) {
      arr = arr.filter(
        (c) => c.collector.includes(t) || c.employeeId.includes(t) || c.supervisor.includes(t),
      );
    }
    return [...arr].sort((a, b) => a.collector.localeCompare(b.collector, "ar"));
  }, [q]);

  const toggle = async (eid: string, key: PermissionKey) => {
    const current = map[eid] ?? DEFAULT_COLLECTOR_PERMISSIONS;
    const next: Permissions = { ...current, [key]: !current[key] };
    setMap((m) => ({ ...m, [eid]: next }));
    setBusy(eid);
    try {
      await upsertPermissions(eid, next, getSession()?.employeeId);
      toast.success("تم تحديث الصلاحيات");
    } catch (e: any) {
      // rollback
      setMap((m) => ({ ...m, [eid]: current }));
      toast.error(e?.message || "تعذر التحديث");
    } finally {
      setBusy(null);
    }
  };

  const resetAll = async (eid: string) => {
    const current = map[eid] ?? DEFAULT_COLLECTOR_PERMISSIONS;
    setMap((m) => ({ ...m, [eid]: DEFAULT_COLLECTOR_PERMISSIONS }));
    setBusy(eid);
    try {
      await upsertPermissions(eid, DEFAULT_COLLECTOR_PERMISSIONS, getSession()?.employeeId);
      toast.success("تم استعادة الصلاحيات الافتراضية");
    } catch (e: any) {
      setMap((m) => ({ ...m, [eid]: current }));
      toast.error(e?.message || "تعذر التحديث");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      <Card className="p-3 space-y-2">
        <div className="text-xs text-muted-foreground">
          التحكم في صلاحيات كل محصل: عرض البيانات، حاسبة الخصم، تصدير، إدارة. القيم الافتراضية تحافظ
          على السلوك الحالي.
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو الرقم الوظيفي…"
          className="h-9"
        />
        <div className="text-[11px] text-muted-foreground">
          {loading ? "جاري التحميل…" : `الإجمالي: ${list.length}`}
        </div>
      </Card>

      <div className="space-y-2">
        {list.map((c) => {
          const perms = map[c.employeeId] ?? DEFAULT_COLLECTOR_PERMISSIONS;
          return (
            <Card key={c.employeeId} className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{c.collector}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {c.employeeId} · {c.supervisor}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  disabled={busy === c.employeeId}
                  onClick={() => resetAll(c.employeeId)}
                >
                  افتراضي
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {KEYS.map((k) => (
                  <label
                    key={k}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs"
                  >
                    <span>{PERMISSION_LABELS[k]}</span>
                    <Switch
                      checked={!!perms[k]}
                      disabled={busy === c.employeeId}
                      onCheckedChange={() => toggle(c.employeeId, k)}
                    />
                  </label>
                ))}
              </div>
            </Card>
          );
        })}
        {list.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground text-sm">لا توجد نتائج</Card>
        )}
      </div>
    </div>
  );
}
