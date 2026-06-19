import {
  CANONICAL_FIELDS,
  type CanonicalRow,
  type FieldDef,
  type FieldType,
} from "./canonical-schema";

// ---------- Header normalization ----------
export function normalizeHeader(s: unknown): string {
  return String(s ?? "")
    .replace(/[\u200B-\u200F\uFEFF\u202A-\u202E]/g, "") // zero-width / bidi marks
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "") // Arabic diacritics
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_\-\.\/\\(),:;|#%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- String similarity (Dice coefficient on bigrams) ----------
function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  if (s.length < 2) {
    if (s) out.add(s);
    return out;
  }
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}
function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a),
    B = bigrams(b);
  let inter = 0;
  A.forEach((x) => {
    if (B.has(x)) inter++;
  });
  return (2 * inter) / (A.size + B.size);
}

// ---------- Value normalization ----------
const TRUE_TOKENS = new Set(["yes", "y", "true", "1", "نعم", "صح", "موجود"]);
const FALSE_TOKENS = new Set(["no", "n", "false", "0", "لا", "غير", "-", ""]);

export function normalizeCell(value: unknown, type: FieldType): string | number | boolean | null {
  if (value == null) return null;
  let v: any = value;
  if (typeof v === "string") v = v.trim();
  if (v === "" || v === "-") return null;

  switch (type) {
    case "number": {
      const n = Number(
        String(v)
          .replace(/[,٬\s]/g, "")
          .replace("%", ""),
      );
      return Number.isFinite(n) ? n : null;
    }
    case "id":
    case "account": {
      const n = Number(v);
      return Number.isFinite(n) && !isNaN(n) ? String(Math.trunc(n)) : String(v).trim();
    }
    case "phone": {
      const s = String(v).replace(/\D/g, "");
      return s || null;
    }
    case "boolean": {
      const s = String(v).trim().toLowerCase();
      if (TRUE_TOKENS.has(s)) return true;
      if (FALSE_TOKENS.has(s)) return false;
      // Death_PF / Death_AL / متوفي keywords
      if (/death|متوف|deceased|wo|wf/i.test(s)) return true;
      if (/yes|نعم|true/.test(s)) return true;
      return Boolean(s) && s !== "0";
    }
    case "date": {
      if (typeof v === "number") {
        // Excel serial date
        const ms = Math.round((v - 25569) * 86400 * 1000);
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      }
      const d = new Date(String(v));
      return isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
    }
    case "product": {
      const s = String(v).toUpperCase();
      if (s.includes("PF") || s.includes("شخص")) return "PF";
      if (s.includes("AL") || s.includes("سيار")) return "AL";
      if (s.includes("CC") || s.includes("ائتم") || s.includes("بطاق")) return "CC";
      return s;
    }
    default:
      return String(v);
  }
}

// ---------- Type-based validation (data sniffing) ----------
function typeScore(samples: unknown[], type: FieldType): number {
  const vals = samples.map((v) => (v == null ? "" : String(v).trim())).filter(Boolean);
  if (vals.length === 0) return 0;
  let hits = 0;
  for (const s of vals) {
    switch (type) {
      case "id":
        if (/^[12]\d{9}$/.test(s.replace(/\D/g, ""))) hits++;
        break;
      case "phone":
        if (/^(05|5|9665|009665|\+9665)/.test(s.replace(/\s/g, ""))) hits++;
        break;
      case "account":
        if (/^\d{6,}$/.test(s.replace(/\D/g, ""))) hits++;
        break;
      case "number":
        if (/^-?[\d,٬]+(\.\d+)?%?$/.test(s)) hits++;
        break;
      case "product":
        if (/^(PF|AL|CC)$/i.test(s) || /شخص|سيار|بطاق|ائتم/.test(s)) hits++;
        break;
      case "boolean":
        if (/^(yes|no|y|n|true|false|0|1|نعم|لا|death|متوف|deceased)/i.test(s)) hits++;
        break;
      case "date":
        if (!isNaN(new Date(s).getTime()) || /^\d{2,4}[-\/]\d{1,2}[-\/]\d{1,4}$/.test(s)) hits++;
        break;
      default:
        hits++;
    }
  }
  return hits / vals.length;
}

// ---------- Detection ----------
export type FieldMatch = {
  field: string;
  sourceColumn: string | null;
  confidence: number; // 0..1
  sample: string | null;
  candidates: { column: string; score: number }[];
};

export type DetectionResult = {
  matches: FieldMatch[]; // length = CANONICAL_FIELDS.length
  unmappedColumns: string[];
};

export function detectMapping(
  headers: string[],
  sampleRows: Record<string, unknown>[] = [],
): DetectionResult {
  const normed = headers.map((h) => ({ orig: h, n: normalizeHeader(h) }));
  const sample20 = sampleRows.slice(0, 20);

  // Score every (field, column) pair
  type Pair = { field: FieldDef; col: { orig: string; n: string }; score: number };
  const pairs: Pair[] = [];

  for (const field of CANONICAL_FIELDS) {
    const aliasesNorm = field.aliases.map(normalizeHeader);
    const forbidNorm = (field.forbid ?? []).map(normalizeHeader);

    for (const col of normed) {
      // forbidden substrings? (must check before any matching)
      if (forbidNorm.some((f) => f && col.n.includes(f))) continue;

      let score = 0;

      // 1. exact alias match
      if (aliasesNorm.includes(col.n)) score = 1.0;
      else {
        // 2. partial alias contains (both directions)
        const partial = aliasesNorm.some(
          (a) => a && (col.n === a || col.n.includes(a) || a.includes(col.n)),
        );
        if (partial) score = 0.9;
        else {
          // 3. fuzzy similarity (best alias)
          let best = 0;
          for (const a of aliasesNorm) {
            const d = dice(col.n, a);
            if (d > best) best = d;
          }
          if (best >= 0.8) score = 0.7 + (best - 0.8) * 0.5; // 0.70 .. 0.80
        }
      }

      if (score <= 0) continue;

      // 4. data-type bonus / penalty
      const colSamples = sample20.map((r) => (r as any)[col.orig]);
      const tScore = typeScore(colSamples, field.type);
      score = Math.min(1, score * (0.7 + 0.3 * tScore) + (tScore >= 0.6 ? 0.05 : 0));

      pairs.push({ field, col, score });
    }
  }

  // Greedy assignment: highest score first, one-to-one column ↔ field
  pairs.sort((a, b) => b.score - a.score);
  const usedColumns = new Set<string>();
  const usedFields = new Set<string>();
  const chosen = new Map<string, Pair>(); // field.key -> Pair
  const allCandidates = new Map<string, { column: string; score: number }[]>();

  for (const p of pairs) {
    if (!allCandidates.has(p.field.key)) allCandidates.set(p.field.key, []);
    allCandidates
      .get(p.field.key)!
      .push({ column: p.col.orig, score: Math.round(p.score * 100) / 100 });
    if (usedColumns.has(p.col.orig) || usedFields.has(p.field.key)) continue;
    chosen.set(p.field.key, p);
    usedColumns.add(p.col.orig);
    usedFields.add(p.field.key);
  }

  const matches: FieldMatch[] = CANONICAL_FIELDS.map((f) => {
    const ch = chosen.get(f.key);
    const sampleVal =
      ch && sample20.length
        ? (() => {
            const raw = sample20.find((r) => (r as any)[ch.col.orig] != null)?.[ch.col.orig];
            return raw == null ? null : String(raw).slice(0, 40);
          })()
        : null;
    return {
      field: f.key,
      sourceColumn: ch?.col.orig ?? null,
      confidence: ch ? Math.round(ch.score * 100) / 100 : 0,
      sample: sampleVal,
      candidates: (allCandidates.get(f.key) ?? []).slice(0, 5),
    };
  });

  const unmappedColumns = headers.filter((h) => !usedColumns.has(h));
  return { matches, unmappedColumns };
}

// ---------- Apply mapping to rows ----------
export type Mapping = Record<string, string | null>; // canonicalField -> sourceColumn (or null)

export function matchesToMapping(matches: FieldMatch[]): Mapping {
  const out: Mapping = {};
  for (const m of matches) out[m.field] = m.sourceColumn;
  return out;
}

export function applyMapping(row: Record<string, unknown>, mapping: Mapping): CanonicalRow {
  const out: CanonicalRow = {};
  for (const field of CANONICAL_FIELDS) {
    const src = mapping[field.key];
    const raw = src ? row[src] : null;
    out[field.key] = normalizeCell(raw, field.type);
  }
  return out;
}

export function applyMappingToRows(
  rows: Record<string, unknown>[],
  mapping: Mapping,
): CanonicalRow[] {
  return rows.map((r) => applyMapping(r, mapping));
}

// ---------- Confidence helpers for UI ----------
export function confidenceColor(c: number): "green" | "yellow" | "red" {
  if (c >= 0.9) return "green";
  if (c >= 0.7) return "yellow";
  return "red";
}
