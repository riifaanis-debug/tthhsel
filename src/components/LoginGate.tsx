import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShieldCheck, BarChart3, LogIn, X, Search, Calculator, FileCheck, UserPlus, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import collectors from "@/data/collectors.json";
import heroMain from "@/assets/hero-main.png";

const ADMIN_USERNAME = "666666";
const ADMIN_PASSWORD = "123456";
const COLLECTOR_PASSWORD = "123456";
const STORAGE_KEY = "wallet:session";
export const DISABLED_KEY = "wallet:collectors:disabled";

type Collector = { supervisor: string; collector: string; employeeId: string };
const COLLECTORS = collectors as Collector[];

function isCollectorDisabled(eid: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const arr = JSON.parse(localStorage.getItem(DISABLED_KEY) || "[]") as string[];
    return Array.isArray(arr) && arr.includes(eid);
  } catch {
    return false;
  }
}

export type Session = {
  role: "collector" | "admin";
  employeeId: string;
  name?: string;
  supervisor?: string;
  loginAt: string;
};

let cachedSession: Session | null = null;
const listeners = new Set<() => void>();

function readStored(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (!cachedSession) cachedSession = readStored();
  return cachedSession;
}

function setSessionState(s: Session | null) {
  cachedSession = s;
  if (typeof window !== "undefined") {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((l) => l());
}

export function clearSession() {
  setSessionState(null);
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"collector" | "admin">("collector");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [step, setStep] = useState<"id" | "password">("id");
  const [resolvedName, setResolvedName] = useState<string>("");
  const now = useNow();

  useEffect(() => {
    // Only resolve the session after mount to ensure consistent initial SSR/client HTML.
    setSession(getSession());
    const cb = () => setSession(getSession());
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  if (session) {
    return <>{children}</>;
  }

  function handleIdNext(e: React.FormEvent) {
    e.preventDefault();
    const eid = employeeId.trim();
    if (!eid) {
      toast.error("أدخل الرقم الوظيفي");
      return;
    }
    if (role === "admin") {
      if (eid !== ADMIN_USERNAME) {
        toast.error("رقم الإدارة غير صحيح");
        return;
      }
      setResolvedName("الإدارة");
    } else {
      const found = COLLECTORS.find((c) => c.employeeId === eid);
      if (!found) {
        toast.error("الرقم الوظيفي غير موجود");
        return;
      }
      if (isCollectorDisabled(eid)) {
        toast.error("تم إغلاق حساب هذا المحصل من قبل الإدارة");
        return;
      }
      setResolvedName(found.collector);
    }
    setPassword("");
    setStep("password");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eid = employeeId.trim();
    if (!password) {
      toast.error("أدخل كلمة المرور");
      return;
    }
    setBusy(true);
    try {
      if (role === "admin") {
        if (eid === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          setSessionState({
            role: "admin",
            employeeId: eid,
            name: "الإدارة",
            loginAt: new Date().toISOString(),
          });
          toast.success("تم الدخول كإدارة");
          return;
        }
        toast.error("بيانات الإدارة غير صحيحة");
        return;
      }
      if (password !== COLLECTOR_PASSWORD) {
        toast.error("كلمة المرور غير صحيحة");
        return;
      }
      const found = COLLECTORS.find((c) => c.employeeId === eid);
      setSessionState({
        role: "collector",
        employeeId: eid,
        name: found?.collector || eid,
        supervisor: found?.supervisor,
        loginAt: new Date().toISOString(),
      });
      toast.success("تم الدخول");
    } finally {
      setBusy(false);
    }
  }

  const openLogin = () => {
    setRole("collector");
    setEmployeeId("");
    setPassword("");
    setStep("id");
    setResolvedName("");
    setLoginOpen(true);
  };

  const time = now ? now.toLocaleTimeString("en-GB", { hour12: false }) : "";
  const date = now
    ? now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background" dir="rtl">
      <div className="fixed inset-0 -z-10 bg-background" />

      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/95 border-b border-primary">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#133E35]">
            <BarChart3 className="size-4 text-primary" />
            <span className="font-bold text-sm">التحصيل الذكي</span>
          </div>
          <div className="text-[#133E35] text-left leading-tight">
            <div className="font-mono font-bold text-xs tabular-nums tracking-wider text-primary">
              {time}
            </div>
            <div className="text-[9px] opacity-70 tabular-nums">{date}</div>
          </div>
        </div>
      </header>

      <section className="relative flex flex-col items-stretch px-4 pt-6 pb-8 text-[#133E35]">
        <div className="w-full max-w-md mx-auto">
          <FeatureSlider />
        </div>

        <div className="mt-8 w-full max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <div className="bg-secondary border border-primary/30 rounded-2xl px-6 py-2 shadow-sm">
              <span className="text-sm font-bold text-[#133E35]">روابط سريعة !</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <QuickLink to="/lookup" label="البحث عن حساب" />
            <QuickLink to="/calculator" label="حاسبة الخصم" />
            <QuickLink
              href="https://najiz.sa/applications/iexecution/Inquiry"
              label="التحقق من طلب تنفيذ"
            />
            <QuickLink to="/third-party" label="إحالة العميل إلى طرف ثالث" />
          </div>
        </div>

        <Button
          onClick={openLogin}
          size="sm"
          className="mt-8 mx-auto bg-secondary hover:bg-primary border border-primary text-[#133E35] rounded-xl px-6 h-9 gap-2 shadow-lg font-semibold text-xs w-auto"
        >
          <LogIn className="size-4" />
          تسجيل الدخول
        </Button>
      </section>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen} modal={false}>
        <DialogContent
          className="max-w-[300px] p-0 gap-0 bg-white border-0 rounded-2xl overflow-hidden shadow-[0_25px_70px_-15px_rgba(19,62,53,0.45)] [&>button]:hidden fixed top-4 left-1/2 -translate-x-1/2 translate-y-0"
          dir="rtl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          style={{ margin: 0, position: "fixed", top: "1rem" }}
        >
          {/* Header: deep green with decorative pattern */}
          <div className="relative bg-[#133E35] px-5 pt-5 pb-8 text-center">
            <button
              type="button"
              onClick={() => setLoginOpen(false)}
              className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
              aria-label="إغلاق"
            >
              <X className="size-4 text-white" />
            </button>
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 L100 100 M100 0 L0 100" stroke="white" strokeWidth="0.4" />
                <path d="M50 0 L50 100 M0 50 L100 50" stroke="white" strokeWidth="0.4" />
              </svg>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg mb-2 ring-1 ring-white/40">
                {role === "admin" ? (
                  <ShieldCheck className="size-5 text-[#133E35]" />
                ) : (
                  <LogIn className="size-5 text-[#133E35]" />
                )}
              </div>
              <DialogHeader className="space-y-0.5">
                <DialogTitle className="text-white text-sm font-bold tracking-tight">
                  {step === "password"
                    ? role === "admin"
                      ? "الإدارة"
                      : `مرحباً ${resolvedName}`
                    : role === "admin"
                      ? "دخول الإدارة"
                      : "تسجيل دخول المحصّل"}
                </DialogTitle>
                <DialogDescription className="text-emerald-50/80 text-[10px] font-light">
                  {step === "password"
                    ? "أدخل كلمة المرور للمتابعة"
                    : "أدخل الرقم الوظيفي لبدء الجلسة"}
                </DialogDescription>
              </DialogHeader>
            </div>
            {/* curve mask */}
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-white rounded-t-2xl" />
          </div>

          {/* Form section */}
          <div className="px-5 pt-1 pb-5">
            {step === "id" ? (
              <form onSubmit={handleIdNext} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#133E35] mr-1 block">
                    الرقم الوظيفي
                  </label>
                  <Input
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    inputMode="numeric"
                    autoFocus
                    placeholder="أدخل رقمك الوظيفي"
                    className="h-10 bg-slate-50 border-2 border-transparent focus-visible:border-[#133E35] focus-visible:bg-white focus-visible:ring-0 rounded-xl text-[#133E35] placeholder:text-slate-400 text-center tabular-nums text-xs font-medium transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-10 bg-[#133E35] hover:bg-[#0e2f29] text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
                >
                  التالي
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setRole((r) => (r === "admin" ? "collector" : "admin"));
                    setEmployeeId("");
                    setPassword("");
                  }}
                  className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-[#133E35] transition-colors pt-1"
                >
                  <ShieldCheck className="size-3" />
                  {role === "admin" ? "تبديل إلى دخول المحصّل" : "تبديل إلى دخول الإدارة"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#133E35] mr-1 block">
                    كلمة المرور
                  </label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
                    className="h-10 bg-slate-50 border-2 border-transparent focus-visible:border-[#133E35] focus-visible:bg-white focus-visible:ring-0 rounded-xl text-[#133E35] placeholder:text-slate-400 text-center tabular-nums text-sm font-bold tracking-[0.5em] transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 bg-[#133E35] hover:bg-[#0e2f29] text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {busy ? "..." : "دخول للنظام"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("id");
                    setPassword("");
                  }}
                  className="w-full text-[10px] font-semibold text-slate-500 hover:text-[#133E35] transition-colors pt-1"
                >
                  رجوع
                </button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import slide1Asset from "@/assets/slide-1.jpeg.asset.json";
import slide2Asset from "@/assets/slide-2.jpeg.asset.json";
import slide3Asset from "@/assets/slide-3.jpeg.asset.json";
import slide4Asset from "@/assets/slide-4.jpeg.asset.json";
import slide5Asset from "@/assets/slide-5.jpeg.asset.json";

const SLIDES = [slide1Asset.url, slide2Asset.url, slide3Asset.url, slide4Asset.url, slide5Asset.url];

function FeatureSlider() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 bg-[#133e35]/15 blur-3xl rounded-[2rem]" />
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-primary bg-black shadow-2xl ring-1 ring-primary"
        style={{ aspectRatio: "16 / 9" }}
        dir="ltr"
      >
        {SLIDES.map((slide, i) => {
          const isActive = i === idx;
          return (
            <div
              key={i}
              className="absolute inset-0 h-full w-full transition-transform duration-[800ms] ease-in-out will-change-transform bg-black flex items-center justify-center"
              style={{
                transform: `translateX(${(idx - i) * 100}%)`,
              }}
            >
              <img
                src={slide}
                alt={`الشريحة ${i + 1}`}
                className="w-full h-full object-cover select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`الشريحة ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === idx
                ? "w-8 bg-primary shadow-[0_0_10px_rgba(55,95,86,0.8)]"
                : "w-1.5 bg-[#cbd5e1]/30 hover:bg-primary"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function QuickLink({
  to,
  href,
  label,
}: {
  to?: string;
  href?: string;
  label: string;
}) {
  let imgSrc: string | null = null;
  if (label === "البحث عن حساب") imgSrc = qlLookupImg.url;
  else if (label === "حاسبة الخصم") imgSrc = qlCalcImg.url;
  else if (label === "التحقق من طلب تنفيذ") imgSrc = qlVerifyImg.url;
  else if (label === "إحالة العميل إلى طرف ثالث") imgSrc = qlThirdPartyImg.url;

  const inner = (
    <div className="flex flex-col items-center group transition-all duration-300 cursor-pointer active:scale-95">
      <div className="size-[72px] sm:size-[92px] rounded-full overflow-hidden ring-2 ring-emerald-500/30 shadow-[0_4px_15px_rgba(19,62,53,0.35)] transition-transform group-hover:scale-105">
        {imgSrc ? (
          <img src={imgSrc} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#0a2026] to-[#123830]">
            <HelpCircle className="size-6 text-emerald-400" />
          </div>
        )}
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link to={to!} className="block">
      {inner}
    </Link>
  );
}

import qlLookupImg from "@/assets/ql-lookup.jpeg.asset.json";
import qlCalcImg from "@/assets/ql-calc.jpeg.asset.json";
import qlVerifyImg from "@/assets/ql-verify.jpeg.asset.json";
import qlThirdPartyImg from "@/assets/ql-thirdparty.jpeg.asset.json";
