// Deterministic reconciliation engine. Pure functions, no AI, no I/O. It compares the rows of a cycle with the
// approved baseline and says exactly what matches by itself and what needs a human decision, and why.
// Nothing here ever turns an evidence reference into an environmental claim (Condition 6).
import { MATERIALS, type Approved, type InRow } from "@/lib/types";
import { norm } from "@/lib/parse";

export const WEIGHT_MIN_G = 0.01;
export const WEIGHT_MAX_G = 5000;
export const LARGE_WEIGHT_CHANGE = 0.1; // 10 percent
export const LARGE_RECYCLED_POINTS = 5;

export const keyOf = (sku: string, component: string) => `${sku.trim().toUpperCase()}|${norm(component)}`;

export type Flag =
  | "missing" // a required field is blank
  | "invalid" // a value is not a valid number or is out of range
  | "unknown_material" // material is not in Cuadre's internal list
  | "unsupported_claim" // recycled content declared with no evidence reference
  | "double_count" // the same evidence reference cited by different suppliers or materials (not verified)
  | "paper_source"; // a non-digital source: a human must review it

export type Kind = "changed" | "new" | "removed" | "conflict" | "flag_only";

export interface Diff { field: string; from: string; to: string }

export interface Exception {
  key: string;
  sku: string;
  component: string;
  kind: Kind;
  large: boolean; // a change big enough that it can never be bulk-accepted
  flags: Flag[];
  reasons: string[]; // Spanish, shown to the coordinator
  candidates: InRow[]; // one row normally; two or more for a conflict
  previous: Approved | null;
  diffs: Diff[];
  canAccept: boolean; // false when the incoming row has a blocking problem (missing, invalid, unknown material)
}

export interface Reconciliation {
  mode: "baseline" | "update";
  matched: string[]; // keys that need no decision
  exceptions: Exception[];
  incomingRows: number;
}

const sameVal = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);
const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "(vacío)" : String(v));

function rowIssues(r: InRow): { flags: Flag[]; reasons: string[] } {
  const flags: Flag[] = [];
  const reasons: string[] = [];
  const miss: string[] = [];
  if (!r.sku) miss.push("sku");
  if (!r.component) miss.push("componente");
  if (!r.material) miss.push("material");
  if (r.weightG === null && !r.bad.includes("peso_g")) miss.push("peso_g");
  if (!r.supplier) miss.push("proveedor");
  if (miss.length) { flags.push("missing"); reasons.push(`Falta información: ${miss.join(", ")}.`); }
  const inv: string[] = [...r.bad];
  if (r.weightG !== null && (r.weightG < WEIGHT_MIN_G || r.weightG > WEIGHT_MAX_G)) inv.push("peso_g fuera de rango");
  if (r.recycledPct !== null && (r.recycledPct < 0 || r.recycledPct > 100)) inv.push("reciclado_pct fuera de 0 a 100");
  if (inv.length) { flags.push("invalid"); reasons.push(`Valor no válido: ${[...new Set(inv)].join(", ")}.`); }
  if (r.material && !(MATERIALS as readonly string[]).includes(r.material)) {
    flags.push("unknown_material");
    reasons.push(`Material «${r.material}» no está en la lista interna de Cuadre (las categorías oficiales no están publicadas).`);
  }
  if ((r.recycledPct ?? 0) > 0 && !r.evidenceRef) {
    flags.push("unsupported_claim");
    reasons.push("Declara contenido reciclado sin referencia de evidencia: se exportará como «sin sustento». Eso no significa que sea falso.");
  }
  if (r.sourceKind === "recibo_papel") {
    flags.push("paper_source");
    reasons.push("La fuente es un registro no digital: requiere revisión humana.");
  }
  return { flags, reasons };
}

function diffOf(prev: Approved, r: InRow): { diffs: Diff[]; large: boolean } {
  const diffs: Diff[] = [];
  let large = false;
  if (!sameVal(prev.material, r.material)) { diffs.push({ field: "material", from: fmt(prev.material), to: fmt(r.material) }); large = true; }
  if (!sameVal(prev.weightG, r.weightG)) {
    diffs.push({ field: "peso_g", from: fmt(prev.weightG), to: fmt(r.weightG) });
    if (prev.weightG && r.weightG !== null) {
      const pct = (r.weightG - prev.weightG) / prev.weightG;
      if (Math.abs(pct) >= LARGE_WEIGHT_CHANGE) large = true;
    } else large = true;
  }
  if (!sameVal(prev.recycledPct, r.recycledPct)) {
    diffs.push({ field: "reciclado_pct", from: fmt(prev.recycledPct), to: fmt(r.recycledPct) });
    if (Math.abs((r.recycledPct ?? 0) - (prev.recycledPct ?? 0)) >= LARGE_RECYCLED_POINTS) large = true;
  }
  if (!sameVal(prev.supplier, r.supplier)) { diffs.push({ field: "proveedor", from: fmt(prev.supplier), to: fmt(r.supplier) }); large = true; }
  if (!sameVal(prev.evidenceRef, r.evidenceRef)) {
    diffs.push({ field: "evidencia", from: fmt(prev.evidenceRef), to: fmt(r.evidenceRef) });
    if (prev.evidenceRef && !r.evidenceRef) large = true;
  }
  return { diffs, large };
}

const sameValues = (a: InRow, b: InRow) =>
  a.material === b.material && sameVal(a.weightG, b.weightG) && sameVal(a.recycledPct, b.recycledPct) && a.supplier === b.supplier && sameVal(a.evidenceRef, b.evidenceRef);

const equalsApproved = (p: Approved, r: InRow) =>
  p.material === r.material && sameVal(p.weightG, r.weightG) && sameVal(p.recycledPct, r.recycledPct) && p.supplier === r.supplier && sameVal(p.evidenceRef, r.evidenceRef);

/** Same evidence reference cited for different suppliers or different materials: a warning, never a verdict. */
function doubleCountKeys(rows: InRow[], baseline: Map<string, Approved>): Set<string> {
  const byRef = new Map<string, Array<{ key: string; supplier: string; material: string }>>();
  const add = (ref: string | null, key: string, supplier: string, material: string, pct: number | null) => {
    if (!ref || (pct ?? 0) <= 0) return;
    const k = norm(ref);
    const arr = byRef.get(k) ?? [];
    arr.push({ key, supplier: norm(supplier), material });
    byRef.set(k, arr);
  };
  for (const p of baseline.values()) add(p.evidenceRef, keyOf(p.sku, p.component), p.supplier, p.material, p.recycledPct);
  for (const r of rows) add(r.evidenceRef, keyOf(r.sku, r.component), r.supplier, r.material, r.recycledPct);
  const out = new Set<string>();
  for (const arr of byRef.values()) {
    const suppliers = new Set(arr.map((a) => a.supplier));
    const materials = new Set(arr.map((a) => a.material));
    if (suppliers.size > 1 || materials.size > 1) arr.forEach((a) => out.add(a.key));
  }
  return out;
}

export function reconcile(incoming: InRow[], baseline: Map<string, Approved>): Reconciliation {
  const mode: "baseline" | "update" = baseline.size === 0 ? "baseline" : "update";
  const groups = new Map<string, InRow[]>();
  for (const r of incoming) {
    const k = keyOf(r.sku, r.component);
    const g = groups.get(k) ?? [];
    g.push(r);
    groups.set(k, g);
  }
  const dc = doubleCountKeys(incoming, baseline);
  const matched: string[] = [];
  const exceptions: Exception[] = [];

  for (const [key, cands] of groups) {
    const prev = baseline.get(key) ?? null;
    const conflict = cands.length > 1 && cands.some((c) => !sameValues(c, cands[0]));
    const rows = conflict ? cands : [cands[cands.length - 1]];
    const first = rows[0];
    let flags: Flag[] = [];
    const reasons: string[] = [];
    for (const r of rows) {
      const iss = rowIssues(r);
      iss.flags.forEach((f) => { if (!flags.includes(f)) flags.push(f); });
      iss.reasons.forEach((x) => { if (!reasons.includes(x)) reasons.push(x); });
    }
    if (dc.has(key)) {
      flags.push("double_count");
      reasons.push("La misma referencia de evidencia aparece con otro proveedor u otro material: posible doble conteo, no verificado.");
    }
    flags = [...new Set(flags)];
    const blocking = flags.some((f) => f === "missing" || f === "invalid" || f === "unknown_material");

    if (conflict) {
      reasons.unshift(`El mismo componente aparece ${cands.length} veces con valores distintos en este ciclo.`);
      exceptions.push({ key, sku: first.sku, component: first.component, kind: "conflict", large: true, flags, reasons, candidates: cands, previous: prev, diffs: [], canAccept: !blocking });
      continue;
    }
    if (!prev) {
      if (mode === "baseline" && flags.length === 0) { matched.push(key); continue; }
      exceptions.push({
        key, sku: first.sku, component: first.component, kind: mode === "baseline" ? "flag_only" : "new", large: mode === "update",
        flags, reasons: mode === "update" ? ["Componente nuevo: no está en el ciclo aprobado anterior.", ...reasons] : reasons,
        candidates: rows, previous: null, diffs: [], canAccept: !blocking,
      });
      continue;
    }
    if (equalsApproved(prev, first)) { matched.push(key); continue; }
    const { diffs, large } = diffOf(prev, first);
    exceptions.push({ key, sku: first.sku, component: first.component, kind: "changed", large: large || blocking, flags, reasons, candidates: rows, previous: prev, diffs, canAccept: !blocking });
  }

  if (mode === "update") {
    for (const [key, prev] of baseline) {
      if (!groups.has(key)) {
        exceptions.push({
          key, sku: prev.sku, component: prev.component, kind: "removed", large: true, flags: [],
          reasons: ["Estaba en el ciclo aprobado anterior y no aparece en este ciclo."], candidates: [], previous: prev, diffs: [], canAccept: true,
        });
      }
    }
  }
  exceptions.sort((a, b) => (a.key < b.key ? -1 : 1));
  return { mode, matched, exceptions, incomingRows: incoming.length };
}
