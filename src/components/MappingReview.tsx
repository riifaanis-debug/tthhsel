import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, XCircle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  applyMappingToRows,
  confidenceColor,
  matchesToMapping,
  type DetectionResult,
  type Mapping,
} from "@/lib/mapping-engine";
import type { CanonicalRow } from "@/lib/canonical-schema";

const db = supabase as any;

export type FileKind = "wallet" | "cases" | "requests" | "changes";

export type MappingReviewProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fileKind: FileKind;
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  detection: DetectionResult;
  onConfirm: (canonicalRows: CanonicalRow[], mapping: Mapping) => void | Promise<void>;
};

export default function MappingReview({
  open,
  onOpenChange,
  fileKind,
  fileName,
  headers,
  rows,
  detection,
  onConfirm,
}: MappingReviewProps) {
  const [mapping, setMapping] = useState<Mapping>(() => matchesToMapping(detection.matches));
  const [saveDefault, setSaveDefault] = useState(true);
  const [busy, setBusy] = useState(false);

  const matches = detection.matches;

  const stats = useMemo(() => {
    const linked = Object.values(mapping).filter(Boolean).length;
    return { linked, total: matches.length };
  }, [mapping, matches.length]);

  function setField(field: string, col: string | null) {
    setMapping((prev) => ({ ...prev, [field]: col }));
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      const canonical = applyMappingToRows(rows, mapping);
      // Save mapping to Supabase (best-effort)
      try {
        if (saveDefault) {
          // clear previous default
          await db
            .from("column_mappings")
            .update({ is_default: false })
            .eq("file_kind", fileKind)
            .eq("is_default", true);
        }
        await db.from("column_mappings").insert({
          file_kind: fileKind,
          mapping: mapping as any,
          is_default: saveDefault,
          label: fileName,
        });
      } catch (e: any) {
        // saving mapping is non-blocking
        console.warn("Failed to persist mapping:", e?.message);
      }
      await onConfirm(canonical, mapping);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("فشل تطبيق الربط: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  }

  function badgeFor(c: number) {
    const tone = confidenceColor(c);
    const cls =
      tone === "green"
        ? "bg-emerald-100 text-emerald-700 border-emerald-300"
        : tone === "yellow"
          ? "bg-amber-100 text-amber-700 border-amber-300"
          : "bg-rose-100 text-rose-700 border-rose-300";
    const icon =
      tone === "green" ? (
        <CheckCircle2 className="size-3" />
      ) : tone === "yellow" ? (
        <AlertTriangle className="size-3" />
      ) : (
        <XCircle className="size-3" />
      );
    return (
      <Badge variant="outline" className={"gap-1 " + cls}>
        {icon}
        {c > 0 ? Math.round(c * 100) + "%" : "—"}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>مراجعة ربط الأعمدة</span>
            <Badge variant="secondary" className="font-normal">
              {stats.linked} / {stats.total} حقل مربوط
            </Badge>
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            راجع الربط التلقائي بين أعمدة الملف <span className="font-medium">{fileName}</span>{" "}
            والحقول المعتمدة قبل الاعتماد.
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-right p-2 font-medium">الحقل المعتمد</th>
                  <th className="text-right p-2 font-medium">العمود في الملف</th>
                  <th className="text-right p-2 font-medium w-20">الثقة</th>
                  <th className="text-right p-2 font-medium">مثال</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const isManualField =
                    m.field === "الاكشن" ||
                    m.field === "تقييم أعمال" ||
                    m.field === "تقييم الأعمال" ||
                    m.field === "تاريخ التجميد" ||
                    m.field === "رقم مرجع الحجز التنفيذي" ||
                    m.field === "السداد";
                  return (
                    <tr key={m.field} className="border-t">
                      <td className="p-2 font-medium align-top">
                        <span>{m.field}</span>
                        {isManualField && (
                          <span className="block text-[9px] text-amber-500 font-medium mt-0.5">
                            (يُعبأ يدوياً · اختياري)
                          </span>
                        )}
                      </td>
                      <td className="p-2 align-top">
                        <Select
                          value={mapping[m.field] ?? "__none"}
                          onValueChange={(v) => setField(m.field, v === "__none" ? null : v)}
                        >
                          <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            <SelectItem value="__none">— غير مربوط —</SelectItem>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 align-top">{badgeFor(m.confidence)}</td>
                      <td className="p-2 align-top text-muted-foreground tabular-nums max-w-[180px] truncate">
                        {m.sample ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {detection.unmappedColumns.length > 0 && (
            <div className="mt-3 text-[11px] text-muted-foreground">
              أعمدة في الملف لم تُربط بأي حقل: {detection.unmappedColumns.join("، ")}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-row-reverse">
          <Button onClick={handleConfirm} disabled={busy} className="gap-1">
            <Save className="size-4" />
            {busy ? "جارٍ الحفظ..." : "اعتماد الربط وإكمال الاستيراد"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            إلغاء
          </Button>
          <label className="flex items-center gap-2 text-xs me-auto">
            <Checkbox checked={saveDefault} onCheckedChange={(v) => setSaveDefault(!!v)} />
            حفظ كافتراضي لهذا النوع من الملفات
          </label>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Load saved default mapping (returns null if none)
export async function loadDefaultMapping(fileKind: FileKind): Promise<Mapping | null> {
  try {
    const { data } = await db
      .from("column_mappings")
      .select("mapping")
      .eq("file_kind", fileKind)
      .eq("is_default", true)
      .maybeSingle();
    return (data?.mapping as Mapping) ?? null;
  } catch {
    return null;
  }
}
