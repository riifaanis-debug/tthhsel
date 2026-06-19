import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Scale, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updateWalletCustomers, deleteWalletCustomers } from "@/lib/wallet-write.functions";
import { getSession } from "@/components/LoginGate";
import MappingReview, { loadDefaultMapping, type FileKind } from "@/components/MappingReview";
import { detectMapping, type DetectionResult, type Mapping } from "@/lib/mapping-engine";
import type { CanonicalRow } from "@/lib/canonical-schema";

const db = supabase as any;

function toStrId(v: any): string | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && !isNaN(n) ? String(Math.trunc(n)) : String(v).trim();
}

async function readExcel(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<any>(sheet, { defval: null });
}

// Open the mapping review for any non-wallet file kind.
// Reads the file, runs detection (overlaid with saved default), and returns the
// state needed to render <MappingReview/>.
async function buildReviewState(file: File, kind: FileKind) {
  const raw = await readExcel(file);
  if (raw.length === 0) throw new Error("الملف فارغ");
  const headers = Object.keys(raw[0] || {});
  const savedDefault = await loadDefaultMapping(kind);
  const detection = detectMapping(headers, raw);
  if (savedDefault) {
    for (const m of detection.matches) {
      const sv = savedDefault[m.field];
      if (sv && headers.includes(sv)) {
        m.sourceColumn = sv;
        m.confidence = 1;
      }
    }
  }
  return { fileName: file.name, headers, rawRows: raw, detection };
}

type ReviewState = {
  fileName: string;
  headers: string[];
  rawRows: Record<string, unknown>[];
  detection: DetectionResult;
} | null;

// ========== Requests File Panel ==========
export function RequestsUploadPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [byType, setByType] = useState<Record<string, number>>({});
  const [review, setReview] = useState<ReviewState>(null);

  const loadCount = async () => {
    const { count: c, data } = await db
      .from("requests_file")
      .select("uploaded_at, request_type", { count: "exact" })
      .order("uploaded_at", { ascending: false })
      .limit(5000);
    setCount(c ?? 0);
    setLast((data && data[0]?.uploaded_at) || null);
    const bt: Record<string, number> = {};
    (data || []).forEach((r: any) => {
      const t = r.request_type || "غير محدد";
      bt[t] = (bt[t] || 0) + 1;
    });
    setByType(bt);
  };
  useEffect(() => {
    void loadCount();
  }, []);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const rs = await buildReviewState(file, "requests");
      setReview(rs);
    } catch (e: any) {
      toast.error("فشل: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmMapping = async (canonical: CanonicalRow[], _m: Mapping) => {
    setBusy(true);
    try {
      const fileName = review?.fileName || "";
      const raws = review?.rawRows || [];
      const rows = canonical.map((c, i) => ({
        account_number: toStrId(c["رقم الحساب"]),
        national_id: toStrId(c["رقم الهوية"]),
        customer_name: (c["اسم العميل"] as any) ?? null,
        product: (c["نوع المنتج"] as any) ?? null,
        amount: typeof c["مبلغ المديونية"] === "number" ? (c["مبلغ المديونية"] as number) : null,
        request_type: (c["تصنيف الطلب"] as any) ?? null,
        request_status: (c["حالة الطلب الفرعية"] as any) ?? null,
        siebel_request_no: toStrId(c["رقم الطلب"]),
        raw: raws[i] as any,
        file_name: fileName,
      }));
      await db.from("requests_file").delete().not("id", "is", null);
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await db.from("requests_file").insert(rows.slice(i, i + CHUNK));
        if (error) throw error;
      }
      toast.success(`تم رفع ${rows.length} طلب`);
      await loadCount();
    } catch (e: any) {
      toast.error("فشل: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <FileText className="size-5" />
        </div>
        <div>
          <div className="font-semibold">ملف الطلبات</div>
          <div className="text-xs text-muted-foreground">
            رفع ملف Excel يحوي طلبات الإعفاء والجدولة. الربط بالمحفظة عبر رقم الحساب أو رقم الهوية.
          </div>
        </div>
      </div>
      {count !== null && (
        <div className="text-xs text-muted-foreground rounded-md border p-3 space-y-1">
          <div>
            عدد الطلبات الحالية:{" "}
            <span className="font-medium text-foreground tabular-nums">{count}</span>
          </div>
          {last && (
            <div>
              آخر رفع:{" "}
              <span className="font-medium text-foreground">
                {new Date(last).toLocaleString("en-US")}
              </span>
            </div>
          )}
          {Object.keys(byType).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {Object.entries(byType).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-[10px]">
                  {k}: {v}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <Button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full h-11">
        <Upload className="size-4 ml-2" />
        {busy ? "جاري الرفع…" : "اختيار ملف الطلبات"}
      </Button>
      {review && (
        <MappingReview
          open={!!review}
          onOpenChange={(v) => {
            if (!v) setReview(null);
          }}
          fileKind="requests"
          fileName={review.fileName}
          headers={review.headers}
          rows={review.rawRows}
          detection={review.detection}
          onConfirm={onConfirmMapping}
        />
      )}
    </Card>
  );
}

// ========== Wallet Changes Panel ==========
export function WalletChangesPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<CanonicalRow[] | null>(null);
  const [rawRows, setRawRows] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [review, setReview] = useState<ReviewState>(null);
  const updateFn = useServerFn(updateWalletCustomers);
  const deleteFn = useServerFn(deleteWalletCustomers);

  const loadHistory = async () => {
    const { data } = await db
      .from("wallet_changes_log")
      .select("*")
      .order("performed_at", { ascending: false })
      .limit(10);
    setHistory(data || []);
  };
  useEffect(() => {
    void loadHistory();
  }, []);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const rs = await buildReviewState(file, "changes");
      setReview(rs);
    } catch (e: any) {
      toast.error("فشل القراءة: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmMapping = async (canonical: CanonicalRow[], _m: Mapping) => {
    setRows(canonical);
    setRawRows(review?.rawRows ?? []);
    setFileName(review?.fileName ?? "");
    setReview(null);
    toast.success(`تم تحليل ${canonical.length} صف. اكتب وصف التغيير ثم اعتمد.`);
  };

  const apply = async () => {
    if (!description.trim()) {
      toast.error("اكتب وصف التغيير");
      return;
    }
    if (!rows || rows.length === 0) {
      toast.error("ارفق ملف Excel");
      return;
    }
    if (!confirm(`هل تريد اعتماد هذه التغييرات على المحفظة الحالية؟\n${rows.length} حساب متأثر.`))
      return;
    setBusy(true);
    try {
      // Detect action keywords in description
      const desc = description.trim();
      const isExclude = /(استبعاد|حذف|إزالة|ازاله)/.test(desc);
      const isTransfer = /(نقل|تدوير|تحويل)/.test(desc);
      const isAdd = /(إضافة|اضافه|جديد)/.test(desc);
      const isUpdate = /(تحديث|تعديل)/.test(desc);

      const session = getSession();
      if (!session || session.role !== "admin") {
        toast.error("الإدارة فقط");
        return;
      }
      let affected = 0;
      const delMatches: Array<{ account_number?: string | null; national_id?: string | null }> = [];
      const upMatches: Array<{
        account_number?: string | null;
        national_id?: string | null;
        patch: any;
      }> = [];
      for (const r of rows) {
        const acc = toStrId(r["رقم الحساب"]);
        const nid = toStrId(r["رقم الهوية"]);
        if (!acc && !nid) continue;
        if (isExclude) {
          delMatches.push({ account_number: acc, national_id: nid });
        } else if (isTransfer || isUpdate) {
          const newAgent = toStrId(r["الرقم الوظيفي للمحصل"]);
          const patch: any = {};
          if (newAgent) patch.agent_employee_id = newAgent;
          const newAmt = r["مبلغ المديونية"];
          if (typeof newAmt === "number") patch.amount = newAmt;
          const newAction = r["الاكشن"];
          if (newAction) patch.action = newAction;
          if (Object.keys(patch).length > 0) {
            upMatches.push({ account_number: acc, national_id: nid, patch });
          }
        }
      }
      if (delMatches.length) {
        const res = await deleteFn({
          data: { employeeId: session.employeeId, matches: delMatches },
        });
        affected += res.affected;
      }
      if (upMatches.length) {
        const res = await updateFn({
          data: { employeeId: session.employeeId, matches: upMatches },
        });
        affected += res.affected;
      }

      await db.from("wallet_changes_log").insert({
        change_type: isExclude ? "exclude" : isTransfer ? "transfer" : isAdd ? "add" : "update",
        description: desc,
        affected_count: affected,
        details: { fileName, rowsCount: rows.length, rawSample: (rawRows || []).slice(0, 3) },
      });
      toast.success(`تم تطبيق التغييرات على ${affected} حساب`);
      setRows(null);
      setRawRows(null);
      setDescription("");
      setFileName("");
      await loadHistory();
    } catch (e: any) {
      toast.error("فشل: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <RefreshCw className="size-5" />
          </div>
          <div>
            <div className="font-semibold">إضافة تغييرات على المحفظة الحالية</div>
            <div className="text-xs text-muted-foreground">
              استبعاد / تدوير / تحديث الحسابات دون رفع محفظة جديدة.
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">وصف التغيير المطلوب</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: استبعاد الحسابات المرفقة من المحفظة"
            rows={3}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        {!rows ? (
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full"
          >
            <Upload className="size-4 ml-2" />
            {busy ? "..." : "إرفاق ملف Excel"}
          </Button>
        ) : (
          <>
            <div className="rounded-md border p-3 text-xs space-y-1">
              <div>
                الملف: <span className="font-medium">{fileName}</span>
              </div>
              <div>
                عدد الصفوف: <span className="font-medium tabular-nums">{rows.length}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRows(null);
                  setRawRows(null);
                  setFileName("");
                }}
                disabled={busy}
              >
                إلغاء
              </Button>
              <Button onClick={apply} disabled={busy}>
                {busy ? "..." : "اعتماد التغييرات"}
              </Button>
            </div>
          </>
        )}
      </Card>

      {review && (
        <MappingReview
          open={!!review}
          onOpenChange={(v) => {
            if (!v) setReview(null);
          }}
          fileKind="changes"
          fileName={review.fileName}
          headers={review.headers}
          rows={review.rawRows}
          detection={review.detection}
          onConfirm={onConfirmMapping}
        />
      )}

      {history.length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">آخر التغييرات</div>
          <ul className="divide-y text-xs">
            {history.map((h) => (
              <li key={h.id} className="py-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{h.change_type}</Badge>
                  <span className="text-muted-foreground tabular-nums">
                    {h.affected_count} حساب
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 line-clamp-2">{h.description}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(h.performed_at).toLocaleString("en-US")}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
