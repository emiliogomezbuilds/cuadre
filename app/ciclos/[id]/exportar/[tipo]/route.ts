import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { uuid } from "@/lib/validate";
import { baselineFrom, latestDecisions, type DbDecision } from "@/lib/data";
import { decisionLogCsv, evidenceCsv, type ExportComponent } from "@/lib/export";
import type { Approved } from "@/lib/types";

export const dynamic = "force-dynamic";

type V = { key: string; sku: string; component: string; version: number; removed: boolean; snapshot: Approved | null; cycle_id: string; decision_key: string | null; created_at: string };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { supabase } = await requireUser();
  const { id, tipo } = await params;
  if (!uuid(id) || (tipo !== "evidencia" && tipo !== "decisiones")) return new NextResponse("No encontrado", { status: 404 });
  const { data: cycles } = await supabase.from("cycles").select("id,number,name,status,approved_single_review").order("number", { ascending: true });
  const target = (cycles ?? []).find((c) => c.id === id);
  if (!target) return new NextResponse("No encontrado", { status: 404 });
  if (target.status !== "approved") return new NextResponse("Solo se exporta un ciclo aprobado.", { status: 409 });
  const upTo = (cycles ?? []).filter((c) => c.number <= target.number);
  const ids = new Set(upTo.map((c) => c.id));
  const nameOf = new Map(upTo.map((c) => [c.id, c.name]));
  const single = new Map(upTo.map((c) => [c.id, c.approved_single_review]));

  if (tipo === "decisiones") {
    const { data: decs } = await supabase.from("decisions").select("key,choice,reason,pick,bulk,created_at,cycle_id").order("created_at", { ascending: true }).limit(5000);
    const items = ((decs ?? []) as DbDecision[]).filter((d) => ids.has(d.cycle_id)).map((d) => ({
      cycleName: nameOf.get(d.cycle_id) ?? "", key: d.key, choice: d.choice, reason: d.reason, bulk: d.bulk, at: d.created_at, singleReview: single.get(d.cycle_id) ?? true,
    }));
    return new NextResponse(decisionLogCsv(items), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cuadre_decisiones_ciclo${target.number}.csv"` } });
  }

  const [{ data: versions }, { data: decs }] = await Promise.all([
    supabase.from("versions").select("key,sku,component,version,removed,snapshot,cycle_id,decision_key,created_at").limit(5000),
    supabase.from("decisions").select("key,choice,reason,pick,bulk,created_at,cycle_id").limit(5000),
  ]);
  const vs = ((versions ?? []) as V[]).filter((v) => ids.has(v.cycle_id));
  const base = baselineFrom(vs);
  const allDecs = ((decs ?? []) as DbDecision[]).filter((d) => ids.has(d.cycle_id));
  const latestByCycle = new Map<string, Map<string, ReturnType<typeof latestDecisions> extends Map<string, infer T> ? T : never>>();
  for (const cid of ids) latestByCycle.set(cid, latestDecisions(allDecs.filter((d) => d.cycle_id === cid)));
  const latestVersionCycle = new Map<string, string>();
  for (const v of vs) {
    const cur = vs.find((x) => x.key === v.key && x.cycle_id === latestVersionCycle.get(v.key));
    if (!cur || v.version > cur.version) latestVersionCycle.set(v.key, v.cycle_id);
  }
  const items: ExportComponent[] = [];
  for (const [key, a] of base) {
    const cid = latestVersionCycle.get(key) ?? target.id;
    const produced = latestByCycle.get(cid)?.get(key) ?? null;
    const inTarget = latestByCycle.get(target.id)?.get(key) ?? null;
    items.push({
      approved: a,
      cycleName: nameOf.get(cid) ?? "",
      decision: produced && produced.choice === "accept_new" ? { choice: produced.choice, reason: produced.reason, bulk: produced.bulk } : null,
      openRequest: inTarget?.choice === "request_supplier",
      singleReview: single.get(cid) ?? true,
    });
  }
  items.sort((x, y) => (x.approved.sku + x.approved.component < y.approved.sku + y.approved.component ? -1 : 1));
  return new NextResponse(evidenceCsv(items), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cuadre_evidencia_ciclo${target.number}.csv"` } });
}
