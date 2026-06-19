export type WaTemplate = {
  id: string;
  name: string;
  collectorName: string;
  body: string;
};

const STORAGE_KEY = "wa:templates";
const DEFAULT_ID_KEY = "wa:default-template-id";

export const DEFAULT_TEMPLATE_BODY = `*السلام عليكم ورحمة الله*

عميلنا  : *{اسم العميل}*

تحيه طيبه وبعد🤍

*من إدارة البنك الأهلي السعودي بجدة*

*الإدارة العامة*

أعتذر على الإزعاج 

تواصلي معك بخصوص مبلغ المديونية القائم عليك لدى البنك الأهلي السعودي

إذا حاب تستفيد من الخصم المقدم لك من البنك الأهلي بموجب خطاب تسويه ، أو مناقشة بدائل أخرى لمعالجة التعثر، ومن ضمنها :

✔︎ *إعادة الجدولة*

✔︎ *شراء المديونية*

✔︎ *تقديم طلب إعفاء من المديونية*

في حال وجود تقرير طبي يوضح العجز وعدم اللياقة الطبية للعمل.

ويهدف هذا التواصل إلى دراسة إمكانية معالجة التعثر والوقوف على رغبتكم ، والإستماع إلى مقترحاتكم ، والعمل معكم للوصول إلى حل مناسب لكم أولًا ، وبما ترونه أنتم ملائماً حسب وضعكم المالي وبما يتوافق مع الأنظمة المعمول بها 

*وشكراً 🤍*`;

export const DEFAULT_TEMPLATES: WaTemplate[] = [
  {
    id: "t1",
    name: "القالب الأول (الافتراضي الحالي)",
    collectorName: "",
    body: DEFAULT_TEMPLATE_BODY,
  },
  {
    id: "t2",
    name: "القالب الثاني",
    collectorName: "",
    body: "",
  },
  {
    id: "t3",
    name: "القالب الثالث",
    collectorName: "",
    body: "",
  },
  {
    id: "t4",
    name: "القالب الرابع",
    collectorName: "",
    body: "",
  },
  {
    id: "t5",
    name: "القالب الخامس",
    collectorName: "",
    body: "",
  },
];

export function loadTemplates(): WaTemplate[] {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const arr = JSON.parse(raw) as WaTemplate[];
    if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_TEMPLATES;
    // Merge: keep stored, fill missing from defaults to ensure 5 exist
    const merged = DEFAULT_TEMPLATES.map((d) => arr.find((t) => t.id === d.id) || d);
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

export function buildHeader(collectorName: string) {
  const name = collectorName.trim() || "———";
  return `معاك : ${name} من إدارة البنك الأهلي بجدة - إدارة التحصيل`;
}

export function getActiveMessage(clientName: string): string {
  const id = getDefaultTemplateId();
  const list = loadTemplates();
  const tpl = list.find((t) => t.id === id) || list[0];
  const header = buildHeader(tpl.collectorName);
  const body = tpl.body.replace(/\{اسم العميل\}/g, clientName || "العميل");
  return `${header}\n\n${body}`;
}
