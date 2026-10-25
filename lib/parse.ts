// CSV parser for supplier packaging files. Deterministic, strict, and all-or-nothing: a malformed file never
// partly imports. Refuses files with columns about collectors or workers (Shadow clause: no worker profiling).
import { SOURCE_KINDS, type InRow, type Origin, type SourceKind } from "@/lib/types";

export const MAX_BYTES = 1_000_000;
export const MAX_ROWS = 500;
const WORKER_HEADER = /(recolect|pepenad|acopiad|scaveng|waste.?pick|segregad|trabajador|worker)/i;

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const HEADER_ALIASES: Record<string, string> = {
  sku: "sku", codigo: "sku", clave: "sku",
  componente: "component", component: "component", parte: "component",
  material: "material",
  peso_g: "weight", peso: "weight", peso_gramos: "weight", gramos: "weight",
  reciclado_pct: "recycled", reciclado: "recycled", contenido_reciclado: "recycled", contenido_reciclado_pct: "recycled",
  proveedor: "supplier", supplier: "supplier",
  evidencia: "evidence", referencia_evidencia: "evidence", referencia: "evidence",
  fuente_tipo: "kind", tipo_fuente: "kind", fuente: "kind",
};
const REQUIRED = ["sku", "component", "material", "weight"] as const;

const KIND_ALIASES: Record<string, SourceKind> = {
  ficha_tecnica: "ficha_tecnica", "ficha tecnica": "ficha_tecnica",
  declaracion_proveedor: "declaracion_proveedor", declaracion: "declaracion_proveedor", "declaracion del proveedor": "declaracion_proveedor",
  estimacion: "estimacion",
  recibo_papel: "recibo_papel", "recibo en papel": "recibo_papel", papel: "recibo_papel", "recibo o documento en papel": "recibo_papel",
};
export const parseKind = (s: string): SourceKind | null => KIND_ALIASES[norm(s)] ?? null;

/** Splits text into records and fields, honoring double quotes. Returns [lineNumber, fields[]] per non-empty record. */
function records(textIn: string, delim: string): Array<[number, string[]]> {
  const out: Array<[number, string[]]> = [];
  let field = "", row: string[] = [], inQ = false, line = 1, startLine = 1;
  const push = () => { row.push(field); field = ""; };
  const endRow = () => { push(); if (row.some((c) => c.trim() !== "")) out.push([startLine, row]); row = []; };
  for (let i = 0; i < textIn.length; i++) {
    const ch = textIn[i];
    if (inQ) {
      if (ch === '"') { if (textIn[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else { if (ch === "\n") line++; field += ch; }
    } else if (ch === '"') inQ = true;
    else if (ch === delim) push();
    else if (ch === "\n") { endRow(); line++; startLine = line; }
    else if (ch === "\r") { /* ignore */ }
    else field += ch;
  }
  if (field !== "" || row.length) endRow();
  return out;
}

function toNum(s: string): { v: number | null; bad: boolean } {
  const t = s.trim();
  if (t === "") return { v: null, bad: false };
  const u = t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t;
  if (!/^-?\d+(\.\d+)?$/.test(u)) return { v: null, bad: true };
  const n = Number(u);
  return Number.isFinite(n) ? { v: n, bad: false } : { v: null, bad: true };
}

export type ParseResult = { ok: true; rows: InRow[] } | { ok: false; error: string };

export function parseCsv(textIn: string, opts: { fileName: string; origin: Origin }): ParseResult {
  if (textIn.length > MAX_BYTES) return { ok: false, error: "El archivo pesa más de 1 MB." };
  const text = textIn.replace(/^﻿/, "");
  const firstLine = text.split("\n", 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const recs = records(text, delim);
  if (recs.length < 2) return { ok: false, error: "El archivo necesita una fila de encabezados y al menos una fila de datos." };
  const [, headerCells] = recs[0];
  const keys = headerCells.map((h) => norm(h).replace(/ /g, "_"));
  const worker = headerCells.find((h) => WORKER_HEADER.test(norm(h)));
  if (worker) return { ok: false, error: `Archivo rechazado: la columna «${worker.trim()}» habla de personas trabajadoras o recolectoras. Cuadre no guarda datos de personas.` };
  const idx: Record<string, number> = {};
  keys.forEach((k, i) => { const f = HEADER_ALIASES[k]; if (f && idx[f] === undefined) idx[f] = i; });
  const missing = REQUIRED.filter((f) => idx[f] === undefined);
  if (missing.length) return { ok: false, error: `Faltan columnas obligatorias: ${missing.map((m) => ({ sku: "sku", component: "componente", material: "material", weight: "peso_g" })[m]).join(", ")}.` };
  const data = recs.slice(1);
  if (data.length > MAX_ROWS) return { ok: false, error: `El archivo tiene más de ${MAX_ROWS} filas.` };
  const cell = (r: string[], f: string) => (idx[f] === undefined ? "" : (r[idx[f]] ?? "").trim());
  const rows: InRow[] = data.map(([line, r]) => {
    const bad: string[] = [];
    const w = toNum(cell(r, "weight")); if (w.bad) bad.push("peso_g");
    const rc = toNum(cell(r, "recycled")); if (rc.bad) bad.push("reciclado_pct");
    const rawKind = cell(r, "kind");
    const kind = rawKind ? parseKind(rawKind) : null;
    if (rawKind && !kind) bad.push("fuente_tipo");
    const ev = cell(r, "evidence");
    return {
      sku: cell(r, "sku").toUpperCase(),
      component: cell(r, "component"),
      material: cell(r, "material"),
      weightG: w.v,
      recycledPct: rc.v,
      supplier: cell(r, "supplier"),
      evidenceRef: ev === "" ? null : ev,
      sourceKind: kind,
      sourceFile: opts.fileName,
      sourceLine: line,
      origin: opts.origin,
      bad,
    };
  });
  return { ok: true, rows };
}

export const KINDS_LIST = SOURCE_KINDS;
