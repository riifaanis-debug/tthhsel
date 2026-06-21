export type WaGender = "الأخ" | "الأخت";

export type WaTemplate = {
  id: string;
  name: string;
  collectorName: string;
  gender: WaGender;
  body: string;
};

const STORAGE_KEY = "wa:templates";
const DEFAULT_ID_KEY = "wa:default-template-id";

export const DEFAULT_TEMPLATE_BODY = `*السلام عليكم ورحمة الله*

*{الجنس} : *{اسم العميل}*

تحيه طيبه وبعد🤍

معاك { اسم المحصل}

*من إدارة البنك الأهلي السعودي بجدة*

*الإدارة العامة*

أعتذر على الإزعاج

تواصلي معك بخصوص مبلغ المديونية القائم عليك لدى البنك الأهلي السعودي

إذا حاب تستفيد من الخصم المقدم لك من البنك بموجب خطاب تسويه ، أو مناقشة بدائل أخرى لمعالجة التعثر، ومن ضمنها :

✔︎ *إعادة الجدولة*

✔︎ *شراء المديونية*

✔︎ *تقديم طلب إعفاء من المديونية*

في حال وجود تقرير طبي يوضح العجز وعدم اللياقة الطبية للعمل.

ويهدف هذا التواصل إلى دراسة إمكانية معالجة التعثر والوقوف على رغبتكم ، والإستماع إلى مقترحاتكم ، والعمل معكم للوصول إلى حل مناسب لكم أولًا ، وبما ترونه أنتم ملائماً حسب وضعكم المالي وبما يتوافق مع الأنظمة المعمول بها

*وشكراً 🤍*`;

export const DEFAULT_TEMPLATES: WaTemplate[] = [
  { id: "t1", name: "القالب الأول (الافتراضي الحالي)", collectorName: "", gender: "الأخ", body: DEFAULT_TEMPLATE_BODY },
  { id: "t2", name: "القالب الثاني", collectorName: "", gender: "الأخ", body: "" },
  { id: "t3", name: "القالب الثالث", collectorName: "", gender: "الأخ", body: "" },
  { id: "t4", name: "القالب الرابع", collectorName: "", gender: "الأخ", body: "" },
  { id: "t5", name: "القالب الخامس", collectorName: "", gender: "الأخ", body: "" },
];

export function loadTemplates(): WaTemplate[] {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const arr = JSON.parse(raw) as Partial<WaTemplate>[];
    if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_TEMPLATES;
    const merged = DEFAULT_TEMPLATES.map((d) => {
      const s = arr.find((t) => t?.id === d.id);
      if (!s) return d;
      return {
        ...d,
        ...s,
        gender: (s.gender as WaGender) || d.gender,
      } as WaTemplate;
    });
    return merged;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplates(list: WaTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getDefaultTemplateId(): string {
  if (typeof window === "undefined") return "t1";
  return localStorage.getItem(DEFAULT_ID_KEY) || "t1";
}

export function setDefaultTemplateId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEFAULT_ID_KEY, id);
}

export function applyTemplateVars(body: string, vars: { clientName: string; collectorName: string; gender: WaGender }) {
  return body
    .replace(/\{\s*اسم العميل\s*\}/g, vars.clientName || "العميل")
    .replace(/\{\s*اسم المحصل\s*\}/g, vars.collectorName || "المحصل")
    .replace(/\{\s*الجنس\s*\}/g, vars.gender || "الأخ");
}

export function getActiveMessage(clientName: string): string {
  const id = getDefaultTemplateId();
  const list = loadTemplates();
  const tpl = list.find((t) => t.id === id) || list[0];
  return applyTemplateVars(tpl.body, {
    clientName,
    collectorName: tpl.collectorName,
    gender: tpl.gender,
  });
}
