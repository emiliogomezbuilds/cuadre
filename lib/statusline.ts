// Week 12 status-travels feature (CHARTER.md, Principle 4): a figure's status is attached to it in the
// same string, not shown in a separate line, so a crop or a screenshot of just the value cannot strip the
// status. Used on screen (ciclo page) and mirrored by the `valor_con_estado` export column (lib/export.ts).
import type { SourceKind } from "@/lib/types";
import { SOURCE_KIND_LABEL } from "@/lib/types";

export function weightWithStatus(weightG: number | null, sourceKind: SourceKind | null): string {
  if (weightG === null) return "(vacío)";
  const status = sourceKind ? SOURCE_KIND_LABEL[sourceKind] : "sin tipo de fuente";
  return `${weightG} g (${status.toLowerCase()}, no verificado por Cuadre)`;
}

export function recycledWithStatus(recycledPct: number | null, evidenceRef: string | null): string {
  if (recycledPct === null) return "(vacío)";
  if (recycledPct <= 0) return "0 % (declarado)";
  if (!evidenceRef) return `${recycledPct} % — sin sustento`;
  return `${recycledPct} % (referencia declarada por el proveedor, no verificada por Cuadre)`;
}

// Generic helper used wherever a bare value needs its status in the same line.
export function withStatus(value: string | number | null, status: string): string {
  if (value === null || value === "") return "(vacío)";
  return `${value} (${status})`;
}
