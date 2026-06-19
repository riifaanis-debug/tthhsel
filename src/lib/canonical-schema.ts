// Canonical wallet schema — ALIGNED 1:1 with the official portfolio Excel file.
// Keys MUST match the file's column names exactly. Aliases are additive only.
// Rule: cards / filters / counters bind to these exact field names — no guessing.

export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "phone"
  | "id"
  | "account"
  | "product";

export type FieldDef = {
  key: string; // canonical Arabic name — MUST equal the official Excel header
  type: FieldType;
  aliases: string[]; // synonyms (Arabic + English + common typos / trailing spaces)
  forbid?: string[]; // substrings in a header name that DISQUALIFY it for this field
};

// Official 29 canonical fields, in the exact order of the portfolio file.
export const CANONICAL_FIELDS: FieldDef[] = [
  {
    key: "رقم الحساب",
    type: "account",
    aliases: [
      "رقم الحساب",
      "account",
      "account number",
      "acc no",
      "ACCOUNT_NUMBER",
      "رقم العقد",
      "contract",
      "contract number",
    ],
  },
  {
    key: "مبلغ المديونية",
    type: "number",
    aliases: [
      "مبلغ المديونية",
      "مبلغ المديونيه",
      "LOAN_BALANCE",
      "Loan Balance",
      "Outstanding",
      "Total Due",
      "Amount",
      "Balance",
      "المبلغ",
      "المبلغ المستحق",
      "رصيد التمويل",
      "رصيد القرض",
      "اجمالي المديونيه",
      "اجمالي المديونية",
      "رصيد",
    ],
  },
  {
    key: "NOTE",
    type: "text",
    aliases: ["NOTE", "Note", "note", "ملاحظة", "ملاحظه", "ملاحظات", "Notes", "تعليق"],
  },
  {
    key: "الاكشن",
    type: "text",
    aliases: [
      "الاكشن",
      "الإجراء",
      "Action",
      "Status",
      "حاله المتابعه",
      "حالة المتابعة",
      "متابعه",
      "متابعة",
    ],
  },
  {
    key: "الرقم الوظيفي للمحصل",
    type: "text",
    aliases: [
      "الرقم الوظيفي للمحصل",
      "ID AGENT",
      "ID_AGENT",
      "Agent ID",
      "Collector ID",
      "Employee ID",
      "Agent Employee ID",
      "الرقم الوظيفي",
      "رقم المحصل",
      "كود المحصل",
      "رقم الموظف",
    ],
  },
  {
    key: "اسم المحصل",
    type: "text",
    aliases: ["اسم المحصل", "Agent", "Collector", "Agent Name", "Collector Name", "المحصل"],
  },
  {
    key: "الرقم الوظيفي للمشرف",
    type: "text",
    aliases: [
      "الرقم الوظيفي للمشرف",
      "Supervisor ID",
      "supervisor employee id",
      "رقم المشرف",
      "كود المشرف",
    ],
  },
  {
    key: "اسم المشرف",
    type: "text",
    aliases: ["اسم المشرف", "Supervisor", "Supervisors", "المشرف", "السوبر فايزر", "سوبرفايزر"],
  },
  {
    key: "نوع المنتج",
    type: "product",
    aliases: ["نوع المنتج", "PRODUCT_CATEGORY", "Product", "Product Type", "المنتج"],
  },
  {
    key: "تاريخ التجميد",
    type: "date",
    aliases: ["تاريخ التجميد", "WO_DT", "Write Off Date", "تاريخ الشطب"],
  },
  {
    key: "jWO_DT",
    type: "date",
    aliases: ["jWO_DT", "jWO-DT", "jwodt", "jwo-dt", "jwo_dt", "JWO_DT", "JWO-DT"],
  },
  {
    key: "عمر الدين",
    type: "text",
    aliases: [
      "عمر الدين",
      "عدد ايام التعثر",
      "عدد أيام التعثر",
      "DPD",
      "DPD_COUNTER",
      "Debt Age",
      "أيام التأخر",
      "ايام التاخر",
      "عدد أيام التأخر",
      "عدد ايام التاخر",
      "Aging",
      "Age Bucket",
      "فئة عمر الدين",
      "شريحة عمر الدين",
    ],
  },
  {
    key: "رقم الهوية",
    type: "id",
    aliases: [
      "رقم الهوية",
      "رقم الهويه",
      "CUST_ID_NO",
      "National ID",
      "ID Number",
      "هوية العميل",
      "السجل المدني",
      "رقم السجل المدني",
      "هوية",
      "هويه",
    ],
    forbid: ["agent", "employee", "موظف", "محصل", "وظيفي", "مشرف", "supervisor"],
  },
  {
    key: "اسم العميل",
    type: "text",
    aliases: [
      "اسم العميل",
      "CUST_NAME_1",
      "CUST_NAME_2",
      "Customer Name",
      "Client Name",
      "Name",
      "العميل",
      "الاسم",
    ],
    forbid: ["agent", "collector", "محصل", "supervisor", "مشرف"],
  },
  {
    key: "رقم الجوال",
    type: "phone",
    aliases: [
      "رقم الجوال",
      "الجوال",
      "CUST_PHONE_MOBILE_1",
      "CUST_PHONE_MOBILE_2",
      "Mobile",
      "Phone",
      "Tel",
      "رقم العميل",
      "هاتف العميل",
      "موبايل",
      "تلفون",
    ],
    forbid: ["agent", "موظف", "محصل", "مشرف"],
  },
  {
    key: "عميل متوفي",
    type: "boolean",
    aliases: [
      "عميل متوفي",
      "متوفي",
      "متوفى",
      "Death",
      "Deceased",
      "Deceased Customer",
      "وفاه",
      "وفاة",
    ],
  },
  {
    key: "عميل رواتب",
    type: "boolean",
    aliases: ["عميل رواتب", "Salary", "Salary Customer", "Payroll", "راتب", "رواتب"],
  },
  {
    key: "تقييم أعمال",
    type: "text",
    aliases: ["تقييم الأعمال", "تقييم الاعمال", "Business Rating", "Business Evaluation", "تقييم"],
  },
  {
    key: "سند غير مؤرشف",
    type: "text",
    aliases: [
      "سند غير مؤرشف",
      "سند غير مؤرشفه",
      "السند غير مؤرشف",
      "غير مؤرشف",
      "سجل غير مؤرشف",
      "سندات غير مؤرشفة",
    ],
  },
  {
    key: "رقم القضية",
    type: "text",
    aliases: [
      "رقم القضية",
      "رقم القضيه",
      "Case Number",
      "Case No",
      "CaseNo",
      "CaseNo. رقم القضية",
      "رقم الدعوى",
      "القضية",
      "القضيه",
    ],
  },
  {
    key: "اسم المحكمة",
    type: "text",
    aliases: ["اسم المحكمة", "Court", "Court Name", "المحكمة", "المحكمه"],
  },
  {
    key: "رقم مرجع الحجز التنفيذي",
    type: "text",
    aliases: [
      "رقم مرجع الحجز التنفيذي",
      "مرجع الحجز التنفيذي",
      "رقم المرجع التنفيذي",
      "Execution Reference",
      "Execution Ref",
      "رقم التنفيذ",
      "مرجع التنفيذ",
    ],
  },
  {
    key: "أرصدة محجوزة",
    type: "number",
    aliases: [
      "أرصدة محجوزة",
      "أرصده محجوزه",
      "ارصدة محجوزه",
      "ارصده محجوزه",
      "Blocked Balance",
      "Held Balance",
      "Frozen Balance",
      "رصيد محجوز",
      "أرصده محجوزه بالحساب الجاري",
    ],
  },
  {
    key: "السداد",
    type: "number",
    aliases: ["السداد", "سداد", "مبلغ السداد", "Paid Amount", "Paid", "payment", "المدفوع"],
  },
  {
    key: "رقم طلب سبيل",
    type: "text",
    aliases: [
      "رقم طلب سبيل",
      "رقم طلب سيبل",
      "Siebel Request No",
      "Siebel No",
      "رقم سيبل",
      "طلب اعفاء",
      "طلب إعفاء",
      "Exemption",
      "Exemption Request",
    ],
  },
  {
    key: "نوع الطلب",
    type: "text",
    aliases: ["نوع الطلب", "Request Type", "RequestType", "نوع طلب"],
  },
  { key: "الوصف", type: "text", aliases: ["الوصف", "Description", "Desc", "ملخص", "تفاصيل"] },
];

export const CANONICAL_KEYS = CANONICAL_FIELDS.map((f) => f.key);

export type CanonicalRow = Record<string, string | number | boolean | null>;
