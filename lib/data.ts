// Loads a cycle from the database and recomputes the reconciliation on the server. The browser is never trusted:
// every action recomputes from stored rows, the approved versions and the stored decisions.
import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcile, keyOf, type Reconciliation } from "@/lib/engine";
import type { Decision } from "@/lib/decisions";
import type { Approved, Choice, InRow, Origin, SourceKind } from "@/lib/types";

export interface CycleRow {
  id: string;
  number: number;
  name: string;
  status: "draft" | "approved";
  simulated: boolean;
  first_import_at: string | null;
  approved_at: string | null;
  approved_single_review: boolean;
  created_at: string;
}

type DbRow = {
  sku: string; component: string; material: string; weight_g: number | string | null; recycled_pct: number | string | null; supplier: string;
  evidence_ref: string | null; source_kind: SourceKind | null; source_file: string; source_line: number; origin: Origin; quote: string | null; bad: string[] | null;
  created_at: string;
};
const num = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));
export const toInRow = (r: DbRow): InRow => ({
  sku: r.sku, component: r.component, material: r.material, weightG: num(r.weight_g), recycledPct: num(r.recycled_pct), supplier: r.supplier,
  evidenceRef: r.evidence_ref, sourceKind: r.source_kind, sourceFile: r.source_file, sourceLine: r.source_line, origin: r.origin, quote: r.quote, bad: r.bad ?? [],
});

type DbVersion = { key: string; sku: string; component: string; version: number; removed: boolean; snapshot: Approved | null; cycle_id: string; decision_key: string | null; created_at: string };

/** Latest version per component, excluding components whose latest version is a removal. */
export function baselineFrom(versions: DbVersion[]): Map<string, Approved> {
  const latest = new Map<string, DbVersion>();
  for (const v of versions) {
    const cur = latest.get(v.key);
    if (!cur || v.version > cur.version) latest.set(v.key, v);
  }
  const out = new Map<string, Approved>();
  for (const [k, v] of latest) if (!v.removed && v.snapshot) out.set(k, { ...v.snapshot, version: v.version });
  return out;
}

export interface DbDecision { key: string; choice: Choice; reason: string; pick: number | null; bulk: boolean; created_at: string; cycle_id: string }

/** Latest decision per key (a later decision supersedes an earlier one; both stay in the log). */
export function latestDecisions(rows: DbDecision[]): Map<string, Decision> {
  const sorted = [...rows].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const m = new Map<string, Decision>();
  for (const d of sorted) m.set(d.key, { key: d.key, choice: d.choice, reason: d.reason, pick: d.pick, bulk: d.bulk });
  return m;
}

export interface CycleState {
  cycle: CycleRow;
  incoming: InRow[];
  rec: Reconciliation;
  decisions: Map<string, Decision>;
  baseline: Map<string, Approved>;
  rowCount: number;
}

export async function loadCycle(supabase: SupabaseClient, id: string): Promise<CycleState | null> {
  const { data: cycle } = await supabase.from("cycles").select("*").eq("id", id).maybeSingle();
  if (!cycle) return null;
  const [{ data: rows }, { data: versions }, { data: decs }] = await Promise.all([
    supabase.from("rows").select("*").eq("cycle_id", id).order("created_at", { ascending: true }).limit(1000),
    supabase.from("versions").select("key,sku,component,version,removed,snapshot,cycle_id,decision_key,created_at").neq("cycle_id", id).limit(5000),
    supabase.from("decisions").select("key,choice,reason,pick,bulk,created_at,cycle_id").eq("cycle_id", id).limit(5000),
  ]);
  const incoming = ((rows ?? []) as DbRow[]).map(toInRow);
  const baseline = baselineFrom((versions ?? []) as DbVersion[]);
  const rec = reconcile(incoming, baseline);
  return { cycle: cycle as CycleRow, incoming, rec, decisions: latestDecisions((decs ?? []) as DbDecision[]), baseline, rowCount: incoming.length };
}

export { keyOf };
