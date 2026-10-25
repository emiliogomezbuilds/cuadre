// Pure handling of model output (no network). A model proposal is DATA until a person confirms it. The one hard rule:
// a proposed row survives only if its quote appears word for word in the text the coordinator pasted, and every
// number and reference it proposes appears inside that quote. Anything else is discarded, not repaired.
import { MATERIALS } from "@/lib/types";

export const AI_MAX_ROWS = 40;

export interface AiRow {
  sku: string;
  component: string;
  material: string | null;
  weightG: number | null;
  recycledPct: number | null;
  supplier: string;
  evidenceRef: string | null;
  quote: string;
}

const strip = (raw: string) => raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function parseAiRows(raw: string): AiRow[] | null {
  let j: unknown;
  try { j = JSON.parse(strip(raw)); } catch { return null; }
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const rows = (j as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return null;
  return rows.slice(0, AI_MAX_ROWS).filter((r) => r && typeof r === "object").map((r) => {
    const o = r as Record<string, unknown>;
    return {
      sku: s(o.sku, 40).toUpperCase(),
      component: s(o.component, 60),
      material: s(o.material, 30) || null,
      weightG: n(o.weightG),
      recycledPct: n(o.recycledPct),
      supplier: s(o.supplier, 80),
      evidenceRef: s(o.evidenceRef, 60) || null,
      quote: s(o.quote, 400),
    };
  });
}

const squash = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
const numbersIn = (t: string) => (t.match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(",", "."))).filter(Number.isFinite);

export interface Dropped { row: AiRow; reason: string }

export function checkAiRows(rows: AiRow[], pastedText: string): { kept: AiRow[]; dropped: Dropped[] } {
  const text = squash(pastedText);
  const kept: AiRow[] = [];
  const dropped: Dropped[] = [];
  for (const r of rows) {
    const q = squash(r.quote);
    if (q.length < 4) { dropped.push({ row: r, reason: "sin cita" }); continue; }
    if (!text.includes(q)) { dropped.push({ row: r, reason: "la cita no aparece palabra por palabra en el texto" }); continue; }
    if (!r.sku || !text.includes(r.sku.toLowerCase())) { dropped.push({ row: r, reason: "el SKU no aparece en el texto" }); continue; }
    const nums = numbersIn(q);
    if (r.weightG !== null && !nums.includes(r.weightG)) { dropped.push({ row: r, reason: "el peso no aparece en la cita" }); continue; }
    if (r.recycledPct !== null && !nums.includes(r.recycledPct)) { dropped.push({ row: r, reason: "el porcentaje no aparece en la cita" }); continue; }
    if (r.evidenceRef && !q.includes(r.evidenceRef.toLowerCase())) { dropped.push({ row: r, reason: "la referencia no aparece en la cita" }); continue; }
    kept.push(r);
  }
  return { kept, dropped };
}

export interface PhotoDraft { material: string | null; weightG: number | null; quote: string }
export function parsePhoto(raw: string): PhotoDraft | null {
  let j: unknown;
  try { j = JSON.parse(strip(raw)); } catch { return null; }
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const o = j as Record<string, unknown>;
  const m = s(o.material, 30);
  return {
    material: (MATERIALS as readonly string[]).includes(m) ? m : null,
    weightG: n(o.weightG),
    quote: s(o.quote, 200),
  };
}
