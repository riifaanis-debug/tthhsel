import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  Download,
  Send,
  User,
  IdCard,
  Box,
  CreditCard,
  Percent,
  Coins,
  Tag,
  Calculator,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { formatSAR } from "@/lib/discount-policy";

export const Route = createFileRoute("/discount-card")({
  head: () => ({
    meta: [
      { title: "بطاقة تسوية وخصم مبدئي" },
      { name: "description", content: "بطاقة عرض تسوية وخصم مبدئي للعميل." },
    ],
  }),
  component: DiscountCardPage,
});

type Payload = {
  name: string;
  idNo: string;
  accountNo: string;
  phone: string;
  productLabel: string;
  rate: number;
  bal: number;
  discount: number;
  settlement: number;
};

function DiscountCardPage() {
  const [data, setData] = useState<Payload | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    try {
      // 1) Try URL hash (works across tabs/devices)
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const d = params.get("d");
        if (d) {
          const json = decodeURIComponent(escape(atob(d)));
          setData(JSON.parse(json));
          return;
        }
      }
      // 2) Fallback: sessionStorage (same tab)
      const raw = sessionStorage.getItem("discountCard:data");
      if (raw) setData(JSON.parse(raw));
    } catch (err) {
      console.warn("Error restoring state:", err);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth > 940 ? 900 : window.innerWidth - 32;
      setScale(containerWidth / 900);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSave = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 900,
        height: 1200,
        pixelRatio: 3, // Ultra-high 300 DPI resolution resolution
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `discount-card-${data?.idNo || "card"}.png`;
      a.click();
      toast.success("تم حفظ البطاقة بدقة عالية");
    } catch (e) {
      toast.error("تعذر حفظ البطاقة");
    }
  };

  const handleSend = async () => {
    if (!data) return;
    const raw = (data.phone || "").replace(/\D/g, "");
    if (!raw) return toast.error("لا يوجد رقم جوال للعميل");
    let intl = raw;
    if (intl.startsWith("00")) intl = intl.slice(2);
    else if (intl.startsWith("0")) intl = "966" + intl.slice(1);
    else if (!intl.startsWith("966")) intl = "966" + intl;

    const text =
      `بطاقة تسوية وخصم مبدئي\n` +
      `عميلنا العزيز: ${data.name}\n` +
      `رقم الهوية: ${data.idNo}\n` +
      `رقم حساب التمويل: ${data.accountNo}\n` +
      `نوع المنتج: ${data.productLabel}\n` +
      `نسبة الخصم: ${(data.rate * 100).toFixed(0)}%\n` +
      `مبلغ المديونية: ${formatSAR(data.bal)} ريال\n` +
      `مبلغ الخصم: ${formatSAR(data.discount)} ريال\n` +
      `مبلغ العرض والتسوية: ${formatSAR(data.settlement)} ريال`;

    // Try saving the image first for the user to share, then open WhatsApp
    try {
      if (cardRef.current) {
        const dataUrl = await toPng(cardRef.current, {
          width: 900,
          height: 1200,
          pixelRatio: 3,
          cacheBust: true,
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `discount-card-${data.idNo || "card"}.png`;
        a.click();
      }
    } catch (err) {
      console.warn("Could not generate card image preview inside WhatsApp handler:", err);
    }

    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (!data) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">لا توجد بيانات للبطاقة</p>
          <p className="text-sm text-muted-foreground">
            يرجى العودة إلى حاسبة الخصم والضغط على «إصدار بطاقة خصم وتسوية مبدئي».
          </p>
        </div>
      </div>
    );
  }

  const ratePct = `${(data.rate * 100).toFixed(0)}%`;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-neutral-100 py-8 px-4 flex flex-col items-center gap-6"
    >
      {/* Import Cairo Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        .cairo-font {
          font-family: 'Cairo', sans-serif !important;
        }
      `}</style>

      {/* Responsive Aspect-Ratio Outer Wrapper */}
      <div
        style={{
          width: 900 * scale,
          height: 1200 * scale,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Scale container */}
        <div
          style={{
            width: 900,
            height: 1200,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* Main Card Element (Unscaled relative to target coordinate plane) */}
          <div
            ref={cardRef}
            className="cairo-font"
            style={{
              width: 900,
              height: 1200,
              background: "#FAF9F6",
              position: "relative",
              overflow: "hidden",
              boxSizing: "border-box",
              border: "1px solid #D9D3C2",
              boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
              direction: "rtl",
              textAlign: "right",
            }}
          >
            {/* Elegant top-left gold-bordered wave background */}
            <svg
              width="480"
              height="200"
              viewBox="0 0 480 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
            >
              <path
                d="M 0 0 L 395 0 C 395 105, 345 155, 165 165 C 105 168, 0 152, 0 152"
                stroke="#C9A961"
                strokeWidth="6"
                fill="none"
              />
              <path
                d="M 0 0 L 390 0 C 390 100, 340 150, 160 160 C 100 163, 0 147, 0 147 Z"
                fill="#014132"
              />
            </svg>

            {/* Document icon inside green wave */}
            <div style={{ position: "absolute", left: 55, top: 40, pointerEvents: "none" }}>
              <svg
                width="65"
                height="75"
                viewBox="0 0 65 75"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="2" width="61" height="71" rx="8" stroke="white" strokeWidth="4" />
                <line
                  x1="14"
                  y1="20"
                  x2="51"
                  y2="20"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1="14"
                  y1="35"
                  x2="51"
                  y2="35"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1="14"
                  y1="50"
                  x2="35"
                  y2="50"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="44" cy="50" r="4" fill="white" />
              </svg>
            </div>

            {/* Top-Right Title Header */}
            <div
              style={{
                position: "absolute",
                top: 45,
                right: 60,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                transformOrigin: "top right",
              }}
            >
              <h1
                style={{
                  fontFamily: "Cairo",
                  fontSize: "48px",
                  fontWeight: 800,
                  color: "#014132",
                  margin: 0,
                  letterSpacing: "-0.5px",
                }}
              >
                بطاقة تسوية
              </h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <div style={{ height: "2px", flex: 1, minWidth: "40px", background: "#C9A961" }} />
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#C9A961",
                    whiteSpace: "nowrap",
                  }}
                >
                  وخصم مبدئي
                </span>
                <div style={{ height: "2px", flex: 1, minWidth: "40px", background: "#C9A961" }} />
              </div>
            </div>

            {/* Name/Greeting Area */}
            <div
              style={{
                position: "absolute",
                top: 200,
                right: 60,
                left: 60,
                direction: "rtl",
                textAlign: "right",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "23px",
                    fontWeight: 700,
                    color: "#014132",
                  }}
                >
                  عميلنا العزيز :
                </span>
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "23px",
                    fontWeight: 700,
                    color: "#014132",
                    marginRight: "8px",
                  }}
                >
                  {data.name}
                </span>
              </div>
              <div
                style={{
                  marginTop: "12px",
                  fontFamily: "Cairo",
                  fontSize: "21px",
                  fontWeight: 600,
                  color: "#014132",
                }}
              >
                تحية طيبة وبعد
              </div>
            </div>

            {/* Paragraph Text */}
            <p
              style={{
                position: "absolute",
                top: 285,
                right: 60,
                left: 60,
                fontFamily: "Cairo",
                fontSize: "20px",
                fontWeight: 500,
                color: "#014132",
                lineHeight: "1.7",
                textAlign: "justify",
                direction: "rtl",
                margin: 0,
              }}
            >
              نفيدكم بأن عليكم التزاماً مالياً قائماً بإجمالي رصيد قدره ({" "}
              <span style={{ fontWeight: 700 }}>{formatSAR(data.bal)} ريال</span> ) لم يتم سداده حتى
              تاريخه ، وعليه ، فقد تم منحكم عرض تسوية وخصم استثنائي مقدم من البنك الأهلي السعودي
              وفقاً للبيانات الموضحة أدناه .
            </p>

            {/* FIELDS GRID */}
            {/* ROW 1: رقم الحساب & نسبة الخصم */}
            {/* Right Box (رقم الحساب) */}
            <div
              style={{
                position: "absolute",
                top: 400,
                right: 60,
                width: 375,
                height: 72,
                border: "1.5px solid #014132",
                borderRadius: "12px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "row",
                direction: "rtl",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {/* Label (Green background, right-aligned) */}
              <div
                style={{
                  width: 135,
                  background: "#014132",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: "1.5px solid #014132",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textAlign: "center",
                  }}
                >
                  رقم الحساب
                </span>
              </div>
              {/* Value (White background, left-aligned) */}
              <div
                style={{
                  flex: 1,
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "25px",
                    fontWeight: 600,
                    color: "#014132",
                    letterSpacing: "0.5px",
                  }}
                >
                  {data.accountNo}
                </span>
              </div>
            </div>

            {/* Left Box (نسبة الخصم) */}
            <div
              style={{
                position: "absolute",
                top: 400,
                left: 60,
                width: 375,
                height: 72,
                border: "1.5px solid #014132",
                borderRadius: "12px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "row",
                direction: "rtl",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {/* Label (Green background, right-aligned) */}
              <div
                style={{
                  width: 135,
                  background: "#014132",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: "1.5px solid #014132",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textAlign: "center",
                  }}
                >
                  نسبة الخصم
                </span>
              </div>
              {/* Value (White background, left-aligned) */}
              <div
                style={{
                  flex: 1,
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "25px",
                    fontWeight: 600,
                    color: "#014132",
                  }}
                >
                  {ratePct}
                </span>
              </div>
            </div>

            {/* ROW 2: مبلغ المديونية & مبلغ الخصم */}
            {/* Right Box (مبلغ المديونية) */}
            <div
              style={{
                position: "absolute",
                top: 490,
                right: 60,
                width: 375,
                height: 72,
                border: "1.5px solid #014132",
                borderRadius: "12px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "row",
                direction: "rtl",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {/* Label Area */}
              <div
                style={{
                  width: 135,
                  background: "#014132",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: "1.5px solid #014132",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textAlign: "center",
                  }}
                >
                  مبلغ المديونية
                </span>
              </div>
              {/* Value Area */}
              <div
                style={{
                  flex: 1,
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  padding: "0 12px",
                  paddingLeft: "60px",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "25px",
                    fontWeight: 600,
                    color: "#014132",
                  }}
                >
                  {formatSAR(data.bal)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    fontFamily: "Cairo",
                    fontSize: "25px",
                    fontWeight: 600,
                    color: "#014132",
                  }}
                >
                  ريال
                </span>
              </div>
            </div>

            {/* Left Box (مبلغ الخصم) */}
            <div
              style={{
                position: "absolute",
                top: 490,
                left: 60,
                width: 375,
                height: 72,
                border: "1.5px solid #014132",
                borderRadius: "12px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "row",
                direction: "rtl",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {/* Label Area */}
              <div
                style={{
                  width: 135,
                  background: "#014132",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: "1.5px solid #014132",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textAlign: "center",
                  }}
                >
                  مبلغ الخصم
                </span>
              </div>
              {/* Value Area */}
              <div
                style={{
                  flex: 1,
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  padding: "0 12px",
                  paddingLeft: "60px",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "25px",
                    fontWeight: 600,
                    color: "#014132",
                  }}
                >
                  {formatSAR(data.discount)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    fontFamily: "Cairo",
                    fontSize: "25px",
                    fontWeight: 600,
                    color: "#014132",
                  }}
                >
                  ريال
                </span>
              </div>
            </div>

            {/* ROW 3: مبلغ العرض والتسوية النهائي (Full span) */}
            <div
              style={{
                position: "absolute",
                top: 580,
                right: 60,
                left: 60,
                height: 72,
                border: "1.5px solid #014132",
                borderRadius: "12px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "row",
                direction: "rtl",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {/* Label Area */}
              <div
                style={{
                  width: 310,
                  background: "#014132",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: "1.5px solid #014132",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "19px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textAlign: "center",
                    letterSpacing: "-0.2px",
                  }}
                >
                  مبلغ العرض والتسوية النهائي
                </span>
              </div>
              {/* Value Area (Dynamic Size - 30px Bold) */}
              <div
                style={{
                  flex: 1,
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 12px",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "30px",
                    fontWeight: 700,
                    color: "#014132",
                  }}
                >
                  {formatSAR(data.settlement)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    left: "16px",
                    fontFamily: "Cairo",
                    fontSize: "30px",
                    fontWeight: 700,
                    color: "#014132",
                  }}
                >
                  ريال
                </span>
              </div>
            </div>

            {/* CONDITIONS/CHECKLIST BOX */}
            <div
              style={{
                position: "absolute",
                top: 672,
                right: 60,
                left: 60,
                height: 265,
                border: "1.5px solid #C9A961",
                borderRadius: "20px",
                background: "#ffffff",
                padding: "24px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  direction: "rtl",
                  alignItems: "center",
                  gap: "14px",
                  justifyContent: "flex-start",
                  borderBottom: "1.5px dashed #C9A961",
                  paddingBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "#014132",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div
                  style={{
                    fontFamily: "Cairo",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#014132",
                  }}
                >
                  في حال سداد مبلغ التسوية الموضح أعلاه
                </div>
              </div>

              {/* TIMELINE LIST */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  direction: "rtl",
                  marginTop: "16px",
                  gap: "16px",
                  position: "relative",
                  height: "135px",
                }}
              >
                {/* Timeline graphics */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    width: "32px",
                    flexShrink: 0,
                  }}
                >
                  {/* Badge 1 */}
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: "2px solid #C9A961",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#C9A961" />
                    </svg>
                  </div>

                  {/* Connecting track */}
                  <div
                    style={{
                      position: "absolute",
                      top: "22px",
                      bottom: "10px",
                      width: "2px",
                      borderLeft: "2px dotted #C9A961",
                    }}
                  />

                  {/* Badge 2 */}
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: "2px solid #C9A961",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "52px",
                      zIndex: 10,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#C9A961" />
                    </svg>
                  </div>
                </div>

                {/* Timeline text content */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    textAlign: "right",
                    direction: "rtl",
                    paddingBottom: "4px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Cairo",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#014132",
                      lineHeight: "1.4",
                    }}
                  >
                    سيتم تزويدكم بمخالصة نهائية ، ولن يتم مطالبتكم بأي مبالغ متبقية مستقبلا.
                  </div>
                  <div
                    style={{
                      fontFamily: "Cairo",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#014132",
                      lineHeight: "1.5",
                    }}
                  >
                    كما سيتم البدء فوراً في اتخاذ الإجراءات اللازمة لإنهاء السند التنفيذي وتقديم طلب
                    التنازل ، والعمل على تحديث بياناتكم الائتمانية لدى الشركة السعودية للمعلومات
                    الائتمانية (سمة) وفق الإجراءات المعتمده.
                  </div>
                </div>
              </div>
            </div>

            {/* IMPORTANT CAUTION NOTE BOX */}
            <div
              style={{
                position: "absolute",
                top: 957,
                right: 60,
                left: 60,
                height: 165,
                border: "1.5px solid #C9A961",
                borderRadius: "20px",
                background: "#FAF9F6",
                padding: "16px 20px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  direction: "rtl",
                  alignItems: "flex-start",
                  gap: "16px",
                  height: "100%",
                }}
              >
                {/* Red megaphone icon */}
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "50%",
                    background: "#D32F2F",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "4px",
                  }}
                >
                  <Megaphone className="size-5 text-white" />
                </div>

                {/* Warning message text */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    textAlign: "right",
                    direction: "rtl",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Cairo",
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "#D32F2F",
                    }}
                  >
                    ملاحظة هامة :
                  </div>
                  <p
                    style={{
                      fontFamily: "Cairo",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#D32F2F",
                      lineHeight: "1.6",
                      margin: 0,
                    }}
                  >
                    في حال عدم قيامكم بسداد مبلغ العرض خلال مدة أقصاها ( 3 أيام ) فإن البنك لن يلتزم
                    بتقديم أي عرض مماثل مستقبلاً، وسيتم الرجوع إلى أصل المديونية ومطالبتكم بكامل
                    الرصيد المستحق.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Graphic Band */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "24px",
                background: "#014132",
              }}
            />
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-4 justify-center pb-6 z-10">
        <Button
          onClick={handleSave}
          size="lg"
          className="gap-2 bg-[#014132] hover:bg-[#012f24] text-white px-8 py-6 text-lg rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          <Download className="size-5" /> حفظ البطاقة بدقة عالية
        </Button>
        <Button
          onClick={handleSend}
          size="lg"
          className="gap-2 bg-[#25D366] hover:bg-[#1da851] text-white px-8 py-6 text-lg rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          <Send className="size-5" /> إرسال البطاقة للعميل
        </Button>
      </div>
    </div>
  );
}
