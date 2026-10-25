// The manual-effort summary (Condition 4: do not hide manual work, do not assume unavailable data).
import type { Decision } from "@/lib/decisions";
import type { Reconciliation } from "@/lib/engine";

export const NOT_AVAILABLE = [
  "Volúmenes de venta por SKU (sin ellos no se puede calcular ninguna cuota).",
  "Las categorías oficiales de envases y el formato oficial de declaración: el reglamento no estaba publicado en las fuentes que revisé.",
  "Tarifas o cuotas de cualquier esquema de responsabilidad extendida del productor.",
  "Documentos de evidencia: Cuadre guarda una referencia que el proveedor declara, no el documento ni su autenticidad.",
  "Una segunda persona que revise: en esta versión quien decide también aprueba.",
];

export interface Effort {
  rowsImported: number;
  matchedAutomatically: number;
  exceptions: number;
  decided: number;
  decidedByHand: number;
  decidedInBulk: number;
  openSupplierRequests: number;
  elapsedMinutes: number | null;
}

export function effort(rec: Reconciliation, decisions: Map<string, Decision>, firstImportAt: string | null, endAt: string | null): Effort {
  let hand = 0, bulk = 0, open = 0;
  for (const e of rec.exceptions) {
    const d = decisions.get(e.key);
    if (!d) continue;
    if (d.bulk) bulk++; else hand++;
    if (d.choice === "request_supplier") open++;
  }
  const start = firstImportAt ? Date.parse(firstImportAt) : NaN;
  const end = endAt ? Date.parse(endAt) : Date.now();
  return {
    rowsImported: rec.incomingRows,
    matchedAutomatically: rec.matched.length,
    exceptions: rec.exceptions.length,
    decided: hand + bulk,
    decidedByHand: hand,
    decidedInBulk: bulk,
    openSupplierRequests: open,
    elapsedMinutes: Number.isFinite(start) ? Math.max(0, Math.round((end - start) / 60000)) : null,
  };
}
