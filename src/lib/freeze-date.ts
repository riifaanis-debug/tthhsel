// Freeze date is derived from JWO_DT by subtracting EXACTLY 3 calendar months,
// preserving day/month/year. Single source of truth used across:
//   - wallet list / table
//   - customer detail card (تاريخ التجميد)
//   - discount calculator (تاريخ التعثر)
//   - canonical → customer mapping
//   - lookup server function
//   - full wallet view & exports
//
// Manual edits to تاريخ التجميد / تاريخ التعثر are no longer allowed; the value
// is recomputed from JWO_DT every time it is rendered.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseJwo(input: any): { y: number; m: number; d: number } | null {
  if (input == null || input === "") return null;

  // Excel serial number (days since 1899-12-30)
  if (typeof input === "number" && isFinite(input)) {
    const ms = Math.round((input - 25569) * 86400 * 1000);
    const dt = new Date(ms);
    if (!isNaN(dt.getTime())) {
      return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    }
  }

  const s = String(input).trim();
  if (!s) return null;

  // yyyy-mm-dd or yyyy/mm/dd (optionally with time)
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };

  // dd-mm-yyyy or dd/mm/yyyy
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return { y: +m[3], m: +m[2], d: +m[1] };

  // Fallback: Date constructor
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
  }
  return null;
}

/**
 * Returns تاريخ التجميد as `yyyy-mm-dd` = JWO_DT minus 3 calendar months.
 * Returns "" when JWO_DT is missing or unparseable.
 */
export function freezeFromJwo(jwo: any): string {
  const p = parseJwo(jwo);
  if (!p) return "";
  let y = p.y;
  let m = p.m - 3;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  // Clamp the day to the last day of the target month so e.g. 31 - 3 months
  // never overflows into the next month.
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(p.d, lastDay);
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Reads JWO_DT from any row-like object (raw / customer / canonical). */
export function readJwo(row: any): any {
  if (!row || typeof row !== "object") return null;
  return row["jWO_DT"] ?? row["jWO-DT"] ?? row["JWO_DT"] ?? row["JWO-DT"] ?? null;
}

/** Computes تاريخ التجميد for a row by reading its JWO_DT field. */
export function freezeForRow(row: any): string {
  return freezeFromJwo(readJwo(row));
}
