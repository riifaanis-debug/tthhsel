import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import handIphone from "@/assets/hand-iphone.png.asset.json";
import { ArrowRight, MessageCircle, Check } from "lucide-react";
import {
  loadTemplates,
  saveTemplates,
  getDefaultTemplateId,
  setDefaultTemplateId,
  applyTemplateVars,
  type WaTemplate,
  type WaGender,
} from "@/lib/wa-templates";

export const Route = createFileRoute("/whatsapp-templates")({
  head: () => ({
    meta: [
      { title: "قوالب واتساب مخصصة" },
      { name: "description", content: "إدارة قوالب رسائل الواتساب المخصصة للمحصلين." },
    ],
  }),
  component: Page,
});

function Page() {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [defaultId, setDefId] = useState<string>("t1");

  useEffect(() => {
    setTemplates(loadTemplates());
    setDefId(getDefaultTemplateId());
  }, []);

  const updateTemplate = (id: string, patch: Partial<WaTemplate>) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      saveTemplates(next);
      return next;
    });
  };

  const onSelectDefault = (id: string) => {
    setDefId(id);
    setDefaultTemplateId(id);
    const t = templates.find((x) => x.id === id);
    toast.success(`تم اعتماد ${t?.name || "القالب"} كقالب افتراضي`);
  };

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <Toaster position="top-center" richColors />
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="رجوع">
              <ArrowRight className="size-5" />
            </Button>
          </Link>
          <div className="size-10 rounded-xl bg-[#25D366] text-white grid place-items-center">
            <MessageCircle className="size-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">قوالب واتساب مخصصة</h1>
            <p className="text-xs text-muted-foreground">إدارة وتخصيص قوالب الرسائل</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        {templates.map((t) => (
          <TemplateEditor
            key={t.id}
            template={t}
            isDefault={t.id === defaultId}
            onChange={(patch) => updateTemplate(t.id, patch)}
          />
        ))}

        {/* Default selector */}
        <Card className="p-4 space-y-3 sticky bottom-2 bg-card/95 backdrop-blur border-primary/40 shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="size-4 text-primary" />
            <h2 className="text-sm font-bold">اختيار القالب الافتراضي المستخدم</h2>
          </div>
          <Select value={defaultId} onValueChange={onSelectDefault}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="اختر قالباً" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            القالب المحدد سيستخدم كافتراضي عند إرسال رسائل واتساب للعملاء.
          </p>
        </Card>
      </main>
    </div>
  );
}

function TemplateEditor({
  template,
  isDefault,
  onChange,
}: {
  template: WaTemplate;
  isDefault: boolean;
  onChange: (patch: Partial<WaTemplate>) => void;
}) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-[#133E35]">{template.name}</h3>
        {isDefault && (
          <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            القالب الافتراضي
          </span>
        )}
      </div>

      {/* Identifier line: collector name + gender */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[#133E35]">سطر التعريف</label>
        <div className="flex items-center gap-2 flex-wrap text-xs bg-muted/40 p-2 rounded-md">
          <Input
            value={template.collectorName}
            onChange={(e) => onChange({ collectorName: e.target.value })}
            placeholder="اسم المحصل"
            className="h-8 flex-1 min-w-[140px] text-xs"
          />
          <Select
            value={template.gender}
            onValueChange={(v) => onChange({ gender: v as WaGender })}
          >
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="الجنس" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="الأخ">الأخ</SelectItem>
              <SelectItem value="الأخت">الأخت</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Field 2: Message body */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[#133E35]">نص الرسالة</label>
        <Textarea
          value={template.body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="اكتب نص الرسالة هنا... المتغيرات: {اسم العميل} {اسم المحصل} {الجنس}"
          className="min-h-[180px] w-full text-xs leading-relaxed"
          dir="rtl"
        />
        <p className="text-[10px] text-muted-foreground">
          المتغيرات المتاحة: <code>{"{اسم العميل}"}</code> <code>{"{اسم المحصل}"}</code>{" "}
          <code>{"{الجنس}"}</code>
        </p>
      </div>

      {/* Field 3: iPhone WhatsApp preview */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[#133E35]">معاينة الرسالة على واتساب</label>
        <IphonePreview
          senderName={template.collectorName}
          message={applyTemplateVars(template.body, {
            clientName: "العميل",
            collectorName: template.collectorName,
            gender: template.gender,
          })}
        />
      </div>
    </Card>
  );
}

function IphonePreview({ message, senderName }: { message: string; senderName: string }) {
  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const displayName = (senderName || "").trim() || "المحصل";

  // Screen area inside the hand-holding-iPhone image (percentages tuned to the mockup)
  const screen = {
    top: "2.5%",
    bottom: "4%",
    left: "18%",
    right: "24%",
  };

  return (
    <div className="mx-auto relative" style={{ width: 320, aspectRatio: "1320 / 1830" }}>
      {/* Hand + iPhone frame image */}
      <img
        src={handIphone.url}
        alt="معاينة iPhone"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-10"
        draggable={false}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />

      {/* Screen content (under the frame image so the notch/bezels stay clean) */}
      <div
        className="absolute overflow-hidden bg-[#ECE5DD]"
        style={{ ...screen, borderRadius: "8%" }}
      >
        {/* Status bar spacer */}
        <div style={{ height: "7%" }} />

        {/* WhatsApp header */}
        <div
          className="bg-[#F6F5F3] flex items-center gap-1.5 border-b border-black/5"
          style={{ paddingInline: 6, paddingBlock: 4 }}
        >
          <span className="text-[9px] text-[#128C7E]">‹</span>
          {/* WhatsApp app icon (notification-style) */}
          <div
            className="rounded-full bg-[#25D366] grid place-items-center shadow-sm"
            style={{ width: 18, height: 18 }}
            aria-label="WhatsApp"
          >
            <MessageCircle
              className="text-white"
              style={{ width: 11, height: 11 }}
              strokeWidth={2.5}
            />
          </div>
          <div className="flex-1 text-right leading-tight">
            <div className="text-[9px] font-bold text-[#111] truncate">{displayName}</div>
            <div className="text-[7px] text-gray-500">متصل الآن</div>
          </div>
        </div>

        {/* Chat area with WhatsApp doodle background */}
        <div
          className="relative flex-1 overflow-hidden px-1.5 py-2"
          style={{
            height: "calc(100% - 14% - 6%)",
            backgroundColor: "#ECE5DD",
            backgroundImage:
              "radial-gradient(rgba(180,160,120,0.18) 1px, transparent 1px), radial-gradient(rgba(180,160,120,0.12) 1px, transparent 1px)",
            backgroundSize: "12px 12px, 18px 18px",
            backgroundPosition: "0 0, 6px 9px",
          }}
        >
          {/* Received message bubble (left side, white) */}
          <div className="flex justify-start">
            <div
              className="relative bg-white text-[#111] rounded-md px-1.5 py-1 max-w-[92%] shadow-sm"
              style={{ fontSize: 7, lineHeight: 1.5 }}
            >
              <pre
                className="whitespace-pre-wrap break-words font-sans m-0"
                style={{ fontSize: 7, lineHeight: 1.5 }}
                dir="rtl"
              >
                {message}
              </pre>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="text-[6px] text-gray-500">{time}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div
          className="absolute inset-x-0 bottom-0 bg-[#F6F5F3] border-t border-black/5 flex items-center gap-1 px-1.5"
          style={{ height: "6%" }}
        >
          <div className="flex-1 bg-white rounded-full h-2/3" />
          <div className="rounded-full bg-[#25D366]" style={{ width: 10, height: 10 }} />
        </div>
      </div>
    </div>
  );
}
