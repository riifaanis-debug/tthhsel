// إدارة سياسة الخصم الشهرية
// تخزين السياسات في LocalStorage حسب الشهر/السنة

export type AgeBucket =
  | "0-1"
  | "1-2"
  | "2-3"
  | "3-4"
  | "4-5"
  | "5-10"
  | "10-15"
  | "Over15"
  | "Over10"
  | "Senior60"
  | "FinalExit";

export const AGE_LABELS: Record<AgeBucket, string> = {
  "0-1": "0 - 1 سنة",
  "1-2": "1 - 2 سنة",
  "2-3": "2 - 3 سنة",
  "3-4": "3 - 4 سنة",
  "4-5": "4 - 5 سنة",
  "5-10": "5 - 10 سنة",
  "10-15": "10 - 15 سنة",
  Over15: "أكثر من 15 سنة",
  Over10: "أكثر من 10 سنة",
  Senior60: "العمر +60 سنة",
  FinalExit: "خروج نهائي",
};

export const PF_CC_BUCKETS: AgeBucket[] = [
  "0-1",
  "1-2",
  "2-3",
  "3-4",
  "4-5",
  "5-10",
  "10-15",
  "Over15",
  "Senior60",
  "FinalExit",
];
export const AL_BUCKETS: AgeBucket[] = [
  "0-1",
  "1-2",
  "2-3",
  "3-4",
  "4-5",
  "5-10",
  "Over10",
  "Senior60",
  "FinalExit",
];

export type ProductType = "PF" | "CC" | "AL";
export type CaseStatus = "no_case" | "with_case";
export type CarStatus = "with_client" | "repossessed";

export type ProductTable = {
  no_case: Partial<Record<AgeBucket, number>>;
  with_case: Partial<Record<AgeBucket, number>>;
};

export type DiscountPolicy = {
  month: number; // 1-12
  year: number;
  PF: ProductTable;
  CC: ProductTable;
  AL: {
    with_client: Partial<Record<AgeBucket, number>>;
    repossessed: Partial<Record<AgeBucket, number>>;
  };
  // خصم السداد المبكر (نسبة إضافية مثل 0.05 = 5%)
  earlyPay?: {
    rate: number;
    beforeDate: string; // ISO YYYY-MM-DD
  };
};

// السياسة الافتراضية لشهر يونيو 2026 (سياسة SNB)
export const DEFAULT_POLICY: DiscountPolicy = {
  month: 6,
  year: 2026,
  PF: {
    no_case: {
      "0-1": 0.2,
      "1-2": 0.2,
      "2-3": 0.4,
      "3-4": 0.5,
      "4-5": 0.55,
      "5-10": 0.6,
      "10-15": 0.7,
      Over15: 0.75,
      Senior60: 0.6,
      FinalExit: 0.6,
    },
    with_case: {
      "0-1": 0.2,
      "1-2": 0.3,
      "2-3": 0.45,
      "3-4": 0.55,
      "4-5": 0.6,
      "5-10": 0.65,
      "10-15": 0.7,
      Over15: 0.75,
      Senior60: 0.6,
      FinalExit: 0.6,
    },
  },
  CC: {
    no_case: {
      "0-1": 0.2,
      "1-2": 0.2,
      "2-3": 0.4,
      "3-4": 0.5,
      "4-5": 0.55,
      "5-10": 0.7,
      "10-15": 0.75,
      Over15: 0.75,
      Senior60: 0.6,
      FinalExit: 0.6,
    },
    with_case: {
      "0-1": 0.2,
      "1-2": 0.3,
      "2-3": 0.45,
      "3-4": 0.55,
      "4-5": 0.6,
      "5-10": 0.7,
      "10-15": 0.75,
      Over15: 0.75,
      Senior60: 0.6,
      FinalExit: 0.6,
    },
  },
  AL: {
    with_client: {
      "0-1": 0.1,
      "1-2": 0.15,
      "2-3": 0.25,
      "3-4": 0.35,
      "4-5": 0.4,
      "5-10": 0.45,
      Over10: 0.6,
      Senior60: 0.6,
      FinalExit: 0.6,
    },
    repossessed: {
      "0-1": 0.15,
      "1-2": 0.25,
      "2-3": 0.4,
      "3-4": 0.5,
      "4-5": 0.55,
      "5-10": 0.55,
      Over10: 0.65,
      Senior60: 0.6,
      FinalExit: 0.6,
    },
  },
  earlyPay: {
    rate: 0.05,
    beforeDate: "2026-06-15",
  },
};

const STORAGE_KEY = "discount:policies:v3";
const ACTIVE_KEY = "discount:active:v3";

export function policyId(p: { month: number; year: number }) {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

// ترقية السياسات القديمة (PF_CC -> PF + CC)
function migrate(raw: any): DiscountPolicy {
  if (raw?.PF && raw?.CC) return raw as DiscountPolicy;
  if (raw?.PF_CC) {
    return {
      month: raw.month,
      year: raw.year,
      PF: raw.PF_CC,
      CC: JSON.parse(JSON.stringify(raw.PF_CC)),
      AL: raw.AL,
      earlyPay: raw.earlyPay ?? DEFAULT_POLICY.earlyPay,
    };
  }
  return DEFAULT_POLICY;
}

export function loadPolicies(): Record<string, DiscountPolicy> {
  if (typeof window === "undefined") return { [policyId(DEFAULT_POLICY)]: DEFAULT_POLICY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = { [policyId(DEFAULT_POLICY)]: DEFAULT_POLICY };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw) as Record<string, any>;
    const out: Record<string, DiscountPolicy> = {};
    for (const k of Object.keys(parsed)) out[k] = migrate(parsed[k]);
    return out;
  } catch {
    return { [policyId(DEFAULT_POLICY)]: DEFAULT_POLICY };
  }
}

export function savePolicies(policies: Record<string, DiscountPolicy>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
}

export function loadActiveId(): string {
  if (typeof window === "undefined") return policyId(DEFAULT_POLICY);
  return localStorage.getItem(ACTIVE_KEY) || policyId(DEFAULT_POLICY);
}

export function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

// حساب عمر الدين بالأيام/السنوات
export function computeDebtAge(defaultDateISO: string, todayISO: string) {
  const a = new Date(defaultDateISO).getTime();
  const b = new Date(todayISO).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return { days: 0, years: 0 };
  const days = Math.floor((b - a) / (1000 * 60 * 60 * 24));
  const years = days / 365.25;
  return { days, years };
}

// تحديد فئة عمر الدين حسب نوع المنتج
export function ageBucketFor(
  years: number,
  product: ProductType,
  opts: {
    isSenior60?: boolean;
    finalExit?: boolean;
  },
): AgeBucket {
  if (opts.finalExit) return "FinalExit";
  if (opts.isSenior60) return "Senior60";
  if (product === "AL") {
    if (years < 1) return "0-1";
    if (years < 2) return "1-2";
    if (years < 3) return "2-3";
    if (years < 4) return "3-4";
    if (years < 5) return "4-5";
    if (years < 10) return "5-10";
    return "Over10";
  }
  // PF / CC
  if (years < 1) return "0-1";
  if (years < 2) return "1-2";
  if (years < 3) return "2-3";
  if (years < 4) return "3-4";
  if (years < 5) return "4-5";
  if (years < 10) return "5-10";
  if (years < 15) return "10-15";
  return "Over15";
}

// جلب نسبة الخصم من السياسة
export function getDiscountRate(
  policy: DiscountPolicy,
  product: ProductType,
  caseStatus: CaseStatus,
  carStatus: CarStatus,
  bucket: AgeBucket,
): number {
  if (product === "AL") {
    return policy.AL[carStatus]?.[bucket] ?? 0;
  }
  const table = product === "PF" ? policy.PF : policy.CC;
  return table[caseStatus]?.[bucket] ?? 0;
}

export function isEarlyPayEligible(policy: DiscountPolicy, todayISO: string): boolean {
  if (!policy.earlyPay) return false;
  return new Date(todayISO).getTime() <= new Date(policy.earlyPay.beforeDate).getTime();
}

export function formatSAR(n: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}
