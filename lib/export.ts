// Evidence export. The exporter never produces an environmental claim: a recycled-content value without an evidence
// reference is left empty and labeled "sin sustento"; a reference is labeled as declared by the supplier and not
// verified by Cuadre. A wording scan (scripts/verify.ts) fails the build if any verified-recycling claim appears.
import type { Approved, Choice } from "@/lib/types";
import { SOURCE_KIND_LABEL } from "@/lib/types";

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

const q = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cells: unknown[]) => cells.map(q).join(",");

export const EVIDENCE_HEADER = ["sku", "componente", "material", "peso_g", "reciclado_pct", "afirmacion_reciclado", "referencia_evidencia", "proveedor", "estado_evidencia", "version", "ciclo", "fuente", "decision", "motivo", "estado", "revision"];

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
        a.sku, a.component, a.material, a.weightG, supported ? a.recycledPct : "", recycledClaim(a), a.evidenceRef ?? "", a.supplier,
        evidenceStatus(a), a.version, it.cycleName, `${a.sourceFile}:${a.sourceLine}`,
        it.decision ? DECISION_ES[it.decision.choice] + (it.decision.bulk ? " (en bloque)" : "") : "coincidió sin intervención",
        it.decision?.reason ?? "", it.openRequest ? "pendiente de proveedor (se conserva el valor anterior)" : "vigente",
        it.singleReview ? "revisión por una sola persona" : "revisión por dos personas",
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
