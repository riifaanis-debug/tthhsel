import { useEffect, useRef, useState } from "react";
import {
  Wallet,
  Clock,
  Target,
  Briefcase,
  Heart,
  FileText,
  Handshake,
  FileMinus,
  CalendarClock,
  Mail,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

const TARGET = 350000;

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export type QuickKey =
  | "promises"
  | "exemptions"
  | "reschedules"
  | "wallet"
  | "mail"
  | "group"
  | "cc"
  | "al"
  | "pf"
  | "salary"
  | "deceased"
  | "sibel";

export function CollectorDashboard({
  collected,
  totalAccounts,
  totalBalance,
  filteredAccounts,
  filteredBalance,
  filteredPF,
  filteredAL,
  filteredCC,
  filteredSalary,
  filteredDeceased,
  filteredSibel,
  mailUnread,
  badges,
  groupEnabled = false,
  onSelectAction,
  onCollectedClick,
}: {
  collected: number;
  totalAccounts: number;
  totalBalance: number;
  filteredAccounts: number;
  filteredBalance: number;
  filteredPF: number;
  filteredAL: number;
  filteredCC: number;
  filteredSalary: number;
  filteredDeceased: number;
  filteredSibel: number;
  mailUnread: number;
  badges: { promises: number; exemptions: number; reschedules: number };
  groupEnabled?: boolean;
  onSelectAction: (key: QuickKey) => void;
  onCollectedClick?: () => void;
}) {
  const now = useNow();
  const eom = endOfMonth(now);
  const diff = Math.max(0, eom.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  const pct = Math.min(100, (collected / TARGET) * 100);

  const remaining = Math.max(0, TARGET - collected);

  const cardCls =
    "bg-white border border-[#e5e2dc] p-4 sm:p-5 rounded-[24px] text-[#133E35] flex flex-col gap-4 select-none w-full max-w-md mx-auto shadow-sm font-sans";
  const fieldCls = "bg-[#eeece7] border border-[#e5e2dc]";
  const buttonFieldCls = `${fieldCls} hover:bg-[#e5e2dc] active:scale-95 transition-all`;

  return (
    <div className="flex flex-col gap-3 w-full" dir="rtl">
      {/* ============ Card 1: Time & Targets ============ */}
      <div className={cardCls}>
        {/* Countdown Timer Row */}
        <div className="flex flex-col gap-1 text-right w-full">
          <div className="flex items-center justify-start gap-1 text-[#234E45] text-[10.5px] font-bold">
            <Clock className="size-3.5" />
            <span>المتبقي على نهاية الشهر</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { v: days, l: "يوم" },
              { v: hours, l: "ساعة" },
              { v: mins, l: "دقيقة" },
              { v: secs, l: "ثانية" },
            ].map((it) => (
              <div
                key={it.l}
                className={`${fieldCls} rounded-[10px] py-1 flex flex-col items-center`}
              >
                <div className="text-base font-extrabold text-[#133E35] tabular-nums leading-none">
                  {String(it.v).padStart(2, "0")}
                </div>
                <div className="text-[9px] text-[#234E45] font-medium mt-0.5">{it.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Achievement Meter */}
        <div className="flex flex-col gap-0.5 text-right">
          <div className="flex items-center justify-start gap-1 text-[10.5px] text-[#133E35] font-bold select-none">
            <Target className="size-3.5 text-[#234E45]" />
            <span>مؤشر التحقيق التفاعلي</span>
          </div>
          <div className="mt-0.5">
            <AchievementMeter pct={pct} realPct={pct} />
          </div>
          <div
            className="flex items-center justify-between mt-0.5 text-[9.5px] tabular-nums text-[#234E45] font-bold"
            dir="ltr"
          >
            <span className="text-[#133E35]">{collected.toLocaleString("en-US")} SAR</span>
            <span>{TARGET.toLocaleString("en-US")} SAR</span>
          </div>
        </div>

        {/* Real Static Achievement Meter */}
        <div className="flex flex-col gap-0.5 text-right">
          <div className="flex items-center justify-start gap-1 text-[10.5px] text-[#133E35] font-bold select-none">
            <Target className="size-3.5 text-[#234E45]" />
            <span>مؤشر التحقيق الفعلي</span>
          </div>
          <div className="mt-0.5">
            <AchievementMeter pct={pct} realPct={pct} staticMode />
          </div>
          <div
            className="flex items-center justify-between mt-0.5 text-[9.5px] tabular-nums text-[#234E45] font-bold"
            dir="ltr"
          >
            <span className="text-[#133E35]">{collected.toLocaleString("en-US")} SAR</span>
            <span>{TARGET.toLocaleString("en-US")} SAR</span>
          </div>
        </div>

        {/* Totals: collected + remaining to target */}
        <div className="grid grid-cols-2 gap-1.5">
          <div
            className={`${fieldCls} rounded-[12px] py-1.5 px-2.5 text-right flex flex-col gap-0.5 min-h-[44px]`}
          >
            <div className="flex items-center justify-start gap-1 text-[#234E45] text-[10px] font-bold">
              <Target className="size-3" />
              <span>إجمالي المحقق</span>
            </div>
            <div className="text-xs font-extrabold text-[#133E35] tabular-nums text-right truncate">
              {collected.toLocaleString("en-US")}{" "}
              <span className="text-[#234E45] text-[8.5px] font-medium">SAR</span>
            </div>
          </div>
          <div
            className={`${fieldCls} rounded-[12px] py-1.5 px-2.5 text-right flex flex-col gap-0.5 min-h-[44px]`}
          >
            <div className="flex items-center justify-start gap-1 text-[#234E45] text-[10px] font-bold">
              <Clock className="size-3" />
              <span>المتبقي للهدف</span>
            </div>
            <div className="text-xs font-extrabold text-[#133E35] tabular-nums text-right truncate">
              {remaining.toLocaleString("en-US")}{" "}
              <span className="text-[#234E45] text-[8.5px] font-medium">SAR</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Card 2: Portfolio Overview ============ */}
      <div className={cardCls}>
        {/* Salary */}
        <button
          type="button"
          onClick={() => onSelectAction("salary")}
          className={`${buttonFieldCls} rounded-[14px] px-3 py-2 flex items-center justify-between w-full cursor-pointer select-none text-[#133E35] font-sans text-right`}
        >
          <div className="flex items-center gap-2">
            <Briefcase className="size-3.5 text-[#ec4899]" />
            <span className="text-[10.5px] font-bold text-[#133E35] text-right">عملاء رواتب</span>
          </div>
          <div className="text-[10.5px] text-[#234E45] font-bold text-left tabular-nums">
            <span className="text-[#133E35] font-black inline-block ml-1">{filteredSalary}</span>
            عميل
          </div>
        </button>

        {/* Deceased */}
        <button
          type="button"
          onClick={() => onSelectAction("deceased")}
          className={`${buttonFieldCls} rounded-[14px] px-3 py-2 flex items-center justify-between w-full cursor-pointer select-none text-[#133E35] font-sans text-right`}
        >
          <div className="flex items-center gap-2">
            <Heart className="size-3.5 text-[#ef4444]" />
            <span className="text-[10.5px] font-bold text-[#133E35] text-right">عملاء متوفين</span>
          </div>
          <div className="text-[10.5px] text-[#234E45] font-bold text-left tabular-nums">
            <span className="text-[#133E35] font-black inline-block ml-1">{filteredDeceased}</span>
            عميل
          </div>
        </button>

        {/* Previous Requests */}
        <button
          type="button"
          onClick={() => onSelectAction("sibel")}
          className={`${buttonFieldCls} rounded-[14px] px-3 py-2 flex items-center justify-between w-full cursor-pointer select-none text-[#133E35] font-sans text-right`}
        >
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 text-[#f59e0b]" />
            <span className="text-[10.5px] font-bold text-[#133E35] text-right">
              عملاء لديهم طلبات سابقة
            </span>
          </div>
          <div className="text-[10.5px] text-[#234E45] font-bold text-left tabular-nums">
            <span className="text-[#133E35] font-black inline-block ml-1">{filteredSibel}</span>
            حساب
          </div>
        </button>
      </div>

      {/* ============ Card 3: Actions ============ */}
      <div className={cardCls}>
        {/* Bento Grid (6 action buttons) */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectAction("promises")}
            className={`relative ${buttonFieldCls} rounded-[15px] p-2 flex flex-col items-center justify-center gap-1.5 h-20 text-center select-none cursor-pointer text-[#133E35]`}
          >
            <Handshake className="size-4.5 text-[#f59e0b]" />
            <span className="text-[9.5px] font-extrabold leading-tight whitespace-nowrap">
              وعود السداد
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectAction("exemptions")}
            className={`relative ${buttonFieldCls} rounded-[15px] p-2 flex flex-col items-center justify-center gap-1.5 h-20 text-center select-none cursor-pointer text-[#133E35]`}
          >
            <FileMinus className="size-4.5 text-[#ec4899]" />
            <span className="text-[9.5px] font-extrabold leading-tight whitespace-nowrap">
              طلبات الإعفاء
            </span>
            {badges.exemptions > 0 && (
              <span className="absolute -top-1 -left-1 bg-[#ef4444] text-white text-[8px] font-black size-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {badges.exemptions}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectAction("reschedules")}
            className={`relative ${buttonFieldCls} rounded-[15px] p-2 flex flex-col items-center justify-center gap-1.5 h-20 text-center select-none cursor-pointer text-[#133E35]`}
          >
            <CalendarClock className="size-4.5 text-[#3b82f6]" />
            <span className="text-[9.5px] font-extrabold leading-tight whitespace-nowrap">
              طلبات الجدولة
            </span>
            {badges.reschedules > 0 && (
              <span className="absolute -top-1 -left-1 bg-[#ef4444] text-white text-[8px] font-black size-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {badges.reschedules}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectAction("wallet")}
            className={`relative ${buttonFieldCls} rounded-[15px] p-2 flex flex-col items-center justify-center gap-1.5 h-20 text-center select-none cursor-pointer text-[#133E35]`}
          >
            <Wallet className="size-4.5 text-amber-500" />
            <span className="text-[9.5px] font-extrabold leading-tight whitespace-nowrap">
              محفظتي
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectAction("mail")}
            className={`relative ${buttonFieldCls} rounded-[15px] p-2 flex flex-col items-center justify-center gap-1.5 h-20 text-center select-none cursor-pointer text-[#133E35]`}
          >
            <Mail className="size-4.5 text-[#3cd4b4]" />
            <span className="text-[9.5px] font-extrabold leading-tight whitespace-nowrap">
              البريد الخاص
            </span>
            {mailUnread > 0 && (
              <span className="absolute -top-1 -left-1 bg-[#ef4444] text-white text-[8px] font-black size-4 rounded-full flex items-center justify-center shadow-md">
                {mailUnread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectAction("group")}
            className={`relative ${buttonFieldCls} rounded-[15px] p-2 flex flex-col items-center justify-center gap-1.5 h-20 text-center select-none cursor-pointer text-[#133E35]`}
          >
            <Lock className={`size-4.5 ${groupEnabled ? "text-[#3cd4b4]" : "text-neutral-400"}`} />
            <span
              className={`text-[9.5px] font-extrabold leading-tight whitespace-nowrap ${groupEnabled ? "" : "text-neutral-300"}`}
            >
              القروب
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Achievement Meter Subcomponent ----------------- */

const MILESTONES = [
  {
    at: 60,
    label: "2%",
    pctLabel: "2%",
    text: "إنسنتفك ≈ تقريباً [ 4,200 - 4,830 ] SAR",
    color: "#eab308",
  },
  {
    at: 67,
    label: "2.5%",
    pctLabel: "2.5%",
    text: "إنسنتفك ≈ تقريباً [ 6,125 - 7,350 ] SAR",
    color: "#a3b510",
  },
  {
    at: 85,
    label: "3%",
    pctLabel: "3%",
    text: "إنسنتفك ≈ تقريباً [ 8,925 - 10,395 ] SAR",
    color: "#84cc16",
  },
  {
    at: 100,
    label: "3.5%",
    pctLabel: "3.5%",
    text: "إنسنتفك ≈ تقريباً [ 12,250 - ∞ ] SAR",
    color: "#22c55e",
  },
];

function AchievementMeter({
  pct,
  realPct,
  staticMode,
}: {
  pct: number;
  realPct: number;
  staticMode?: boolean;
}) {
  const [animPct, setAnimPct] = useState(0);
  const [bursts, setBursts] = useState<Record<number, number>>({});
  const [showReal, setShowReal] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pauseElapsed, setPauseElapsed] = useState(0);
  const lastBurstRef = useRef<number | null>(null);

  useEffect(() => {
    if (showReal || staticMode) return;

    const pauseMs = 4000;
    const segments = [
      { from: 0, to: 60, dur: 8400, pauseAfter: pauseMs },
      { from: 60, to: 67, dur: 980, pauseAfter: pauseMs },
      { from: 67, to: 85, dur: 2520, pauseAfter: pauseMs },
      { from: 85, to: 100, dur: 2100, pauseAfter: pauseMs },
    ];
    const cycleMs = segments.reduce((s, x) => s + x.dur + x.pauseAfter, 0);

    let raf = 0;
    let cancelled = false;
    let startTs = 0;

    // linear easing for smooth continuous motion
    const ease = (k: number) => k;

    const tick = (t: number) => {
      if (cancelled) return;
      if (!startTs) startTs = t;
      const total = (t - startTs) % cycleMs;
      if (total < 50) lastBurstRef.current = null;

      let elapsed = total;
      let nextPct = 0;
      let currentPause: number | null = null;
      let currentPauseElapsed = 0;
      for (const seg of segments) {
        if (elapsed < seg.dur) {
          const k = elapsed / seg.dur;
          nextPct = seg.from + (seg.to - seg.from) * ease(k);
          break;
        }
        elapsed -= seg.dur;
        if (elapsed < seg.pauseAfter) {
          nextPct = seg.to;
          currentPause = seg.to;
          currentPauseElapsed = elapsed;
          break;
        }
        elapsed -= seg.pauseAfter;
      }

      setAnimPct(nextPct);
      setPausedAt(currentPause);
      setPauseElapsed(currentPauseElapsed);

      for (const milestone of MILESTONES) {
        if (
          nextPct >= milestone.at &&
          (lastBurstRef.current === null || milestone.at > lastBurstRef.current)
        ) {
          lastBurstRef.current = milestone.at;
          setBursts((b) => ({ ...b, [milestone.at]: Date.now() }));
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [showReal]);

  const displayPct = showReal || staticMode ? realPct : animPct;
  const pausedMilestone =
    !showReal && pausedAt !== null ? MILESTONES.find((m) => m.at === pausedAt) : null;

  const FIREWORKS_MS = 700;
  const COLOR_FILL_MS = 700;
  const showFireworks = !!pausedMilestone && pauseElapsed < FIREWORKS_MS;
  const colorFillT = pausedMilestone
    ? Math.min(1, Math.max(0, (pauseElapsed - FIREWORKS_MS) / COLOR_FILL_MS))
    : 0;
  const showMessage = !!pausedMilestone && pauseElapsed >= FIREWORKS_MS + COLOR_FILL_MS;

  return (
    <div
      className="relative w-full select-none"
      dir="ltr"
      onMouseEnter={() => setShowReal(true)}
      onMouseLeave={() => setShowReal(false)}
      onTouchStart={() => setShowReal(true)}
      onTouchEnd={() => setShowReal(false)}
      onTouchCancel={() => setShowReal(false)}
    >
      {/* Tick numbers above the bar */}
      <div className="relative h-3 w-full mb-0.5">
        {Array.from({ length: 11 }, (_, i) => i * 10).map((p) => (
          <div
            key={p}
            className="absolute top-0 text-[8px] font-bold tabular-nums leading-none text-[#133E35]"
            style={{ left: `${p}%`, transform: "translateX(-50%)" }}
          >
            {p}
          </div>
        ))}
      </div>
      <div className="relative h-3 w-full rounded-full overflow-hidden bg-[#eeece7] ring-1 ring-[#e5e2dc]">
        {/* Dim base gradient (off state) */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg,#ef4444,#f97316,#eab308,#84cc16,#22c55e)",
            opacity: staticMode ? 1 : 0.18,
            filter: staticMode ? "none" : "saturate(0.6)",
          }}
        />
        {/* Bright illuminated progress portion */}
        {!staticMode && (
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-75 ease-linear"
            style={{
              width: `${displayPct}%`,
              background: "linear-gradient(90deg,#ef4444,#f97316,#eab308,#84cc16,#22c55e)",
              backgroundSize: `${(100 / Math.max(displayPct, 0.0001)) * 100}% 100%`,
              boxShadow: "0 0 12px rgba(255,255,255,0.55), inset 0 0 8px rgba(255,255,255,0.35)",
              filter: "saturate(1.3) brightness(1.1)",
            }}
          />
        )}
        {/* Glowing leading edge (the moving head) */}
        {!staticMode && displayPct > 0 && (
          <>
            {/* outer pulse ring when paused at milestone */}
            {pausedMilestone && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full pointer-events-none animate-ping"
                style={{
                  left: `${displayPct}%`,
                  background: pausedMilestone.color,
                  opacity: 0.7,
                }}
              />
            )}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-5 rounded-full pointer-events-none transition-[left] duration-75 ease-linear"
              style={{
                left: `${displayPct}%`,
                background: "white",
                boxShadow: pausedMilestone
                  ? `0 0 10px 3px ${pausedMilestone.color}, 0 0 20px 6px ${pausedMilestone.color}80`
                  : "0 0 10px 3px rgba(255,255,255,0.9), 0 0 20px 6px rgba(255,255,255,0.5)",
              }}
            />
          </>
        )}
        {pausedMilestone && (
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${displayPct}%`,
              background: pausedMilestone.color,
              opacity: colorFillT,
              boxShadow: `0 0 16px ${pausedMilestone.color}`,
            }}
          />
        )}
        {showFireworks && pausedMilestone && (
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${pausedMilestone.at}%` }}
          >
            <BigFireworks color={pausedMilestone.color} />
          </div>
        )}
        {/* Inside-bar tick marks (subtle) */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 11 }, (_, i) => i * 10).map((p) => (
            <div
              key={p}
              className="absolute top-0 bottom-0 w-px bg-white/40"
              style={{ left: `${p}%`, transform: "translateX(-50%)" }}
            />
          ))}
        </div>
        {/* Milestone stop markers */}
        {!staticMode &&
          MILESTONES.map((m) => {
            const reached = displayPct >= m.at - 0.5;
            const isActive = pausedMilestone?.at === m.at;
            return (
              <div
                key={`stop-${m.at}`}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all"
                style={{ left: `${m.at}%` }}
              >
                <div
                  className="rounded-full border transition-all"
                  style={{
                    width: isActive ? 10 : 6,
                    height: isActive ? 10 : 6,
                    background: reached ? m.color : "rgba(255,255,255,0.6)",
                    borderColor: reached ? "white" : "rgba(19,62,53,0.3)",
                    boxShadow: reached ? `0 0 8px ${m.color}` : "none",
                  }}
                />
              </div>
            );
          })}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {pausedMilestone && showMessage ? (
            <span
              dir="rtl"
              className="flex items-center gap-1 text-[9px] font-extrabold tabular-nums text-[#133E35]"
            >
              <span>إنسنتفك</span>
              <span
                className="text-[10px] font-black"
                style={{
                  color: pausedMilestone.color,
                  textShadow: `0 0 8px ${pausedMilestone.color}`,
                }}
              >
                {pausedMilestone.pctLabel}
              </span>
              <span>{pausedMilestone.text.replace("إنسنتفك ", "")}</span>
            </span>
          ) : null}
        </div>
        {MILESTONES.map((m) => {
          const burst = bursts[m.at];
          if (!burst) return null;
          return (
            <div
              key={m.at}
              className="absolute top-0 -translate-x-1/2 pointer-events-none"
              style={{ left: `${m.at}%` }}
            >
              <Confetti key={burst} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Confetti() {
  const sparks = Array.from({ length: 10 });
  const colors = ["#fde68a", "#6ee7b7", "#fca5a5", "#93c5fd", "#fcd34d"];
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none">
      {sparks.map((_, i) => {
        const angle = Math.PI * (i / sparks.length) - Math.PI / 2;
        const dist = 18 + Math.random() * 14;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 4;
        return (
          <span
            key={i}
            className="absolute block w-1 h-1 rounded-full animate-ping"
            style={{
              background: colors[i % colors.length],
              boxShadow: `0 0 6px ${colors[i % colors.length]}`,
            }}
          />
        );
      })}
    </div>
  );
}

function BigFireworks({ color }: { color: string }) {
  const sparks = Array.from({ length: 22 });
  const palette = ["#fde68a", "#fff7ed", "#fca5a5", "#93c5fd", "#fcd34d", color];
  return (
    <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {sparks.map((_, i) => {
        const angle = (Math.PI * 2 * i) / sparks.length;
        const dist = 22 + Math.random() * 22;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const c = palette[i % palette.length];
        return (
          <span
            key={i}
            className="absolute block w-1.5 h-1.5 rounded-full animate-bounce"
            style={{
              background: c,
              boxShadow: `0 0 10px ${c}`,
            }}
          />
        );
      })}
    </div>
  );
}
