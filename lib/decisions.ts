// Decisions and approval. Pure functions. A decision needs a choice from an allowed list and a reason; nothing is
// pre-selected anywhere (a default is what a tired reviewer accepts). The approval gate refuses to run while any
// exception is undecided. Approval only ever APPENDS versions; it never edits or deletes an old one.
import type { Approved, Choice, InRow } from "@/lib/types";
import { CHOICES } from "@/lib/types";
import { keyOf, type Exception, type Reconciliation } from "@/lib/engine";

export const REASON_MIN = 5;
export const REASON_MAX = 300;

export interface Decision {
  key: string;
  choice: Choice;
  reason: string;
  pick: number | null; // which candidate to take when there are several (conflict)
  bulk: boolean;
}

export const CHOICE_LABEL = (ex: Exception, c: Choice): string => {
  if (c === "accept_new") return ex.kind === "removed" ? "Aceptar la baja" : ex.kind === "flag_only" ? "Incluir en la base" : "Aceptar el nuevo valor";
  if (c === "keep_previous") return "Conservar el anterior";
  if (c === "request_supplier") return "Pedir el dato al proveedor";
  return ex.kind === "flag_only" ? "Dejar fuera de la base" : "Rechazar la fila";
};

export function allowedChoices(ex: Exception): Choice[] {
  const hasPrev = ex.previous !== null;
  const out: Choice[] = [];
  if (ex.canAccept) out.push("accept_new");
  if (hasPrev && ex.kind !== "flag_only") out.push("keep_previous");
  out.push("request_supplier");
  if (!hasPrev && ex.kind !== "removed") out.push("reject_row");
  if (ex.kind === "removed") return out.filter((c) => c !== "reject_row");
  return out;
}

/** Bulk accept is allowed only for small changes with no flag at all; large changes and flags need their own decision. */
export const bulkEligible = (ex: Exception) => ex.kind === "changed" && !ex.large && ex.flags.length === 0 && ex.canAccept;

export function validateDecision(ex: Exception, d: Decision): string | null {
  if (!(CHOICES as readonly string[]).includes(d.choice)) return "Elige una opción.";
  if (!allowedChoices(ex).includes(d.choice)) return "Esa opción no está permitida para este caso.";
  const r = d.reason.trim();
  if (r.length < REASON_MIN) return `Escribe un motivo de al menos ${REASON_MIN} caracteres.`;
  if (r.length > REASON_MAX) return `El motivo es muy largo (máximo ${REASON_MAX}).`;
  if (d.choice === "accept_new" && ex.candidates.length > 1) {
    if (d.pick === null || d.pick < 0 || d.pick >= ex.candidates.length) return "Elige cuál de las filas repetidas quieres aceptar.";
  } else if (d.pick !== null) return "Elección no válida.";
  if (d.bulk && !bulkEligible(ex)) return "Esta excepción no se puede aceptar en bloque: decídela por separado.";
  return null;
}

export function pendingExceptions(rec: Reconciliation, decisions: Map<string, Decision>): Exception[] {
  return rec.exceptions.filter((e) => !decisions.has(e.key));
}

export interface VersionPlan {
  key: string;
  sku: string;
  component: string;
  version: number;
  removed: boolean;
  values: Approved | null; // null only when removed
  decisionKey: string | null; // exception key whose decision produced this version
}

export interface Plan {
  versions: VersionPlan[];
  openRequests: string[]; // keys with a "request_supplier" decision: the previous value stays, marked open
}

const toApproved = (r: InRow, version: number): Approved => ({
  sku: r.sku, component: r.component, material: r.material, weightG: r.weightG, recycledPct: r.recycledPct, supplier: r.supplier,
  evidenceRef: r.evidenceRef, sourceKind: r.sourceKind, origin: r.origin, sourceFile: r.sourceFile, sourceLine: r.sourceLine, version,
});

/** Builds the versions an approval would append. Throws if an exception is undecided or a decision is invalid. */
export function planApproval(rec: Reconciliation, incoming: InRow[], decisions: Map<string, Decision>): Plan {
  const pend = pendingExceptions(rec, decisions);
  if (pend.length) throw new Error(`Faltan ${pend.length} decisiones.`);
  const versions: VersionPlan[] = [];
  const openRequests: string[] = [];

  if (rec.mode === "baseline") {
    // matched rows are accepted as version 1 of the baseline; flagged ones follow their decision
    const incomingByKey = new Map<string, InRow>();
    for (const r of incoming) incomingByKey.set(keyOf(r.sku, r.component), r);
    for (const key of rec.matched) {
      const r = incomingByKey.get(key);
      if (r) versions.push({ key, sku: r.sku, component: r.component, version: 1, removed: false, values: toApproved(r, 1), decisionKey: null });
    }
  }
  for (const ex of rec.exceptions) {
    const d = decisions.get(ex.key)!;
    const err = validateDecision(ex, d);
    if (err) throw new Error(`${ex.sku} · ${ex.component}: ${err}`);
    if (d.choice === "request_supplier") { openRequests.push(ex.key); continue; }
    const prevVersion = ex.previous?.version ?? 0;
    if (d.choice === "accept_new") {
      if (ex.kind === "removed") {
        versions.push({ key: ex.key, sku: ex.sku, component: ex.component, version: prevVersion + 1, removed: true, values: null, decisionKey: ex.key });
      } else {
        const cand = ex.candidates[d.pick ?? 0];
        versions.push({ key: ex.key, sku: ex.sku, component: ex.component, version: prevVersion + 1, removed: false, values: toApproved(cand, prevVersion + 1), decisionKey: ex.key });
      }
    }
    // keep_previous and reject_row append nothing: the old version stands and the decision itself is the record
  }
  return { versions, openRequests };
}
