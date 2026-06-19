"""
مقارنة pixel diff بين البطاقة المُصدَرة من /discount-card والصورة المرجعية.

- يفتح الصفحة بأبعاد عرض تجعل البطاقة بمقياس 1:1 (1535×1024).
- يلتقط البطاقة كعنصر مستقل.
- يعيد تحجيم اللقطة إلى أبعاد المرجع (1169×776) ثم يقارن بكسلًا بكسل
  باستخدام pixelmatch ويخرج diff.png + تقرير JSON بنسبة التطابق.

تشغيل:
    python3 tests/playwright/discount_card_pixel_diff.py
"""

import asyncio
import json
from pathlib import Path
from PIL import Image
from pixelmatch.contrib.PIL import pixelmatch
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8080"
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
REF_PATH = Path(__file__).parent / "reference" / "discount-card-reference.jpeg"

# بيانات تجريبية مطابقة لشكل المرجع (000,000.00 / 00 أيام تظهر في النص)
SAMPLE = {
    "name": "محمد عبدالله القرني",
    "idNo": "1012345678",
    "accountNo": "9876543210",
    "phone": "0501234567",
    "productLabel": "تمويل شخصي",
    "rate": 0.35,
    "bal": 0,
    "discount": 0,
    "settlement": 0,
}


async def capture_card() -> Image.Image:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        # عرض > 1535 يضمن --card-scale = 1 فيُلتقط بدقة 1535×1024
        ctx = await browser.new_context(viewport={"width": 1700, "height": 1200},
                                        device_scale_factor=1)
        page = await ctx.new_page()
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.evaluate(
            "(d) => sessionStorage.setItem('discountCard:data', JSON.stringify(d))",
            SAMPLE,
        )
        await page.goto(f"{BASE_URL}/discount-card", wait_until="networkidle")
        # انتظر تحميل الخطوط/الأيقونات
        await page.wait_for_timeout(800)
        card = page.locator("h1:has-text('بطاقة تسوية وخصم مبدئي')").locator(
            "xpath=ancestor::div[1]"
        )
        # العنصر الحاوي للبطاقة الداخلية (1535×1024)
        inner = page.locator("div").filter(has=card).first
        # ألتقط مباشرةً المنطقة عند offset الـ ref بـ bounding_box للحاوية الجذعية
        # نستخدم cardRef مباشرةً: الـ div ذو width:1535
        target = page.locator("div").nth(0)  # سيُستبدل بـ evaluate أدناه
        box = await page.evaluate(
            """() => {
                const el = [...document.querySelectorAll('div')].find(d => {
                    const s = d.style;
                    return s && s.width === '1535px' && s.height === '1024px';
                });
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { x: r.x, y: r.y, w: r.width, h: r.height };
            }"""
        )
        if not box:
            raise RuntimeError("لم يتم العثور على عنصر البطاقة 1535×1024")
        png = await page.screenshot(clip={"x": box["x"], "y": box["y"],
                                          "width": box["w"], "height": box["h"]})
        await browser.close()
    from io import BytesIO
    return Image.open(BytesIO(png)).convert("RGBA")


def main():
    if not REF_PATH.exists():
        raise SystemExit(f"الصورة المرجعية غير موجودة: {REF_PATH}")
    ref = Image.open(REF_PATH).convert("RGBA")
    print(f"المرجع: {ref.size}")

    shot = asyncio.run(capture_card())
    print(f"اللقطة الأصلية: {shot.size}")
    shot_resized = shot.resize(ref.size, Image.LANCZOS)
    shot_resized.save(OUT / "discount_card_actual.png")

    diff = Image.new("RGBA", ref.size)
    mismatched = pixelmatch(ref, shot_resized, diff,
                            threshold=0.15, includeAA=True)
    diff.save(OUT / "discount_card_diff.png")
    total = ref.size[0] * ref.size[1]
    match_pct = (1 - mismatched / total) * 100

    report = {
        "reference_size": ref.size,
        "actual_size": shot.size,
        "compared_size": ref.size,
        "mismatched_pixels": mismatched,
        "total_pixels": total,
        "match_percent": round(match_pct, 4),
        "threshold": 0.15,
    }
    (OUT / "discount_card_diff_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("=" * 50)
    print(f"البكسلات المختلفة: {mismatched:,} / {total:,}")
    print(f"نسبة التطابق    : {match_pct:.2f}%")
    print(f"diff  → {OUT / 'discount_card_diff.png'}")
    print(f"actual→ {OUT / 'discount_card_actual.png'}")
    print(f"report→ {OUT / 'discount_card_diff_report.json'}")
    # حد قبول 1:1 صارم — نعتبر >= 98% نجاحاً تقريبياً (الخطوط/مضادات التسنين)
    return 0 if match_pct >= 98.0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
