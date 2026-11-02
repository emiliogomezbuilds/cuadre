// Evidence export. The exporter never produces an environmental claim: a recycled-content value without an evidence
// reference is left empty and labeled "sin sustento"; a reference is labeled as declared by the supplier and not
// verified by Cuadre. A wording scan (scripts/verify.ts) fails the build if any verified-recycling claim appears.
import type { Approved, Choice } from "@/lib/types";
import { SOURCE_KIND_LABEL } from "@/lib/types";
import { weightWithStatus, recycledWithStatus } from "@/lib/statusline";

export interface ExportComponent {
  approved: Approved;
  cycleName: string;
  decision: { choice: Choice; reason: string; bulk: boolean } | null;
  openRequest: boolean;
  singleReview: boolean;
}

export const NO_SUPPORT = "sin sustento";
export const DECLARED = "referencia declarada por el proveedor, no verificada por Cuadre";

export function evidenceStatus(a: Approved): string {
  const parts: string[] = [];
  if (a.origin === "simulated") parts.push("SIMULADO");
  if (a.origin === "ai_text" || a.origin === "ai_photo") parts.push("propuesto por IA y confirmado por una persona");
  if (a.sourceKind === "recibo_papel") parts.push("registro en papel (revisión humana registrada)");
  else if (a.sourceKind) parts.push(`${SOURCE_KIND_LABEL[a.sourceKind].toLowerCase()} (declarado, no verificado por Cuadre)`);
  else parts.push("sin tipo de fuente");
  return parts.join("; ");
}

export function recycledClaim(a: Approved): string {
  if ((a.recycledPct ?? 0) <= 0) return "";
  return a.evidenceRef ? DECLARED : NO_SUPPORT;
}

// Persona test, 1 Nov 2026 (PERSONA_EmilioGomez): a sku like "GEL-250", opened in a spreadsheet app, was silently
// reformatted (its own auto data-detection turned the text into a number-like value) — the exact kind of silent
// change Cuadre promises never to make. sku and componente are identifiers, not numbers or dates, so Id(...) marks
// them to be written as an Excel/Numbers text-locked literal (="...") instead of a bare string, which both
// applications read back as the original text rather than guessing a type for it.
class Id { constructor(public raw: string) {} }
const Id_ = (v: unknown) => new Id(v === null || v === undefined ? "" : String(v));

const q = (v: unknown) => {
  if (v instanceof Id) return `"=""${v.raw.replace(/"/g, '""')}"""`;
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cells: unknown[]) => cells.map(q).join(",");

// valor_con_estado (Week 12, CHARTER.md Principle 4): the weight and the recycled-content figure repeated
// with their status attached in the same cell, so a copy of just this column keeps the status with the value.
export const EVIDENCE_HEADER = ["sku", "componente", "material", "peso_g", "reciclado_pct", "afirmacion_reciclado", "referencia_evidencia", "proveedor", "estado_evidencia", "version", "ciclo", "fuente", "decision", "motivo", "estado", "revision", "valor_con_estado"];

const DECISION_ES: Record<Choice, string> = {
  accept_new: "aceptar", keep_previous: "conservar el anterior", request_supplier: "pedir dato al proveedor", reject_row: "rechazar fila",
};

export function evidenceCsv(items: ExportComponent[]): string {
  const lines = [row(EVIDENCE_HEADER)];
  for (const it of items) {
    const a = it.approved;
    const supported = (a.recycledPct ?? 0) > 0 && !!a.evidenceRef;
    lines.push(
      row([
        // sku and componente are identifiers: text-locked (Id_) so a spreadsheet app's own auto-formatting can't
        // silently change them. An approved 0 % stays "0" (a stated value); the cell is empty only when unknown or
        // unsupported.
        Id_(a.sku), Id_(a.component), a.material, a.weightG, supported || a.recycledPct === 0 ? a.recycledPct : "", recycledClaim(a), a.evidenceRef ?? "", a.supplier,
        evidenceStatus(a), a.version, it.cycleName, `${a.sourceFile}:${a.sourceLine}`,
        it.decision ? DECISION_ES[it.decision.choice] + (it.decision.bulk ? " (en bloque)" : "") : it.approved.version === 1 ? "aprobada en la base sin excepción" : "coincidió sin intervención",
        it.decision?.reason ?? "", it.openRequest ? "pendiente de proveedor (se conserva el valor anterior)" : "vigente",
        it.singleReview ? "revisión por una sola persona" : "revisión por dos personas",
        `peso: ${weightWithStatus(a.weightG, a.sourceKind)}; reciclado: ${recycledWithStatus(a.recycledPct, a.evidenceRef)}`,
      ]),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export interface LogEntry { cycleName: string; key: string; choice: Choice; reason: string; bulk: boolean; at: string; singleReview: boolean }
export function decisionLogCsv(items: LogEntry[]): string {
  const lines = [row(["ciclo", "componente", "decision", "motivo", "en_bloque", "fecha", "revision"])];
  for (const e of items) lines.push(row([e.cycleName, e.key.replace("|", " · "), DECISION_ES[e.choice], e.reason, e.bulk ? "sí" : "no", e.at, e.singleReview ? "revisión por una sola persona" : "revisión por dos personas"]));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
