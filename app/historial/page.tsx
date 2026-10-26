import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Shell } from "@/components/shell";
import { latestDecisions, type DbDecision } from "@/lib/data";
import { CHOICE_LABEL } from "@/lib/decisions";
import type { Exception } from "@/lib/engine";
import type { Approved, Choice } from "@/lib/types";

export const dynamic = "force-dynamic";

type V = { key: string; sku: string; component: string; version: number; removed: boolean; snapshot: Approved | null; cycle_id: string; decision_key: string | null };

export default async function Historial() {
  const { supabase, user } = await requireUser();
  const [{ data: cycles }, { data: versions }, { data: decs }] = await Promise.all([
    supabase.from("cycles").select("id,number,name"),
    supabase.from("versions").select("key,sku,component,version,removed,snapshot,cycle_id,decision_key").order("version", { ascending: true }).limit(5000),
    supabase.from("decisions").select("key,choice,reason,pick,bulk,created_at,cycle_id").limit(5000),
  ]);
  const cname = new Map((cycles ?? []).map((c) => [c.id, `Ciclo ${c.number}: ${c.name}`]));
  const dec = new Map<string, ReturnType<typeof latestDecisions>>();
  for (const c of cycles ?? []) dec.set(c.id, latestDecisions(((decs ?? []) as DbDecision[]).filter((d) => d.cycle_id === c.id)));
  const byKey = new Map<string, V[]>();
  for (const v of (versions ?? []) as V[]) byKey.set(v.key, [...(byKey.get(v.key) ?? []), v]);
  const keys = [...byKey.keys()].sort();
  const label = (c: Choice) => CHOICE_LABEL({ kind: "changed", previous: null } as unknown as Exception, c);
  return (
    <Shell email={user.email} wide>
      <p className="text-sm"><Link href="/dashboard" className="text-blue-800 hover:underline">← Tus ciclos</Link></p>
      <h1 className="mt-2 text-2xl font-bold">Historial por componente</h1>
      <p className="mt-2 text-slate-700">Cada versión aprobada de cada componente, con el ciclo que la produjo y la decisión que la respalda. Las versiones no se editan ni se borran.</p>
      {keys.length === 0 ? (
        <p className="mt-6 rounded-md border bg-white p-4 text-sm">Todavía no hay versiones aprobadas.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {keys.map((k) => {
            const vs = byKey.get(k)!;
            return (
              <section key={k} className="rounded-md border bg-white p-4">
                <h2 className="font-semibold">{vs[0].sku} · {vs[0].component}</h2>
                <ol className="mt-2 space-y-2 text-sm">
                  {vs.map((v) => {
                    const d = v.decision_key ? dec.get(v.cycle_id)?.get(v.decision_key) : null;
                    return (
                      <li key={v.version} className="rounded border bg-slate-50 p-2">
                        <div className="font-medium">Versión {v.version} · {cname.get(v.cycle_id)}{v.removed ? " · BAJA" : ""}</div>
                        {v.snapshot && (
                          <div className="text-xs text-slate-700">{v.snapshot.material} · {v.snapshot.weightG ?? "(vacío)"} g · reciclado {v.snapshot.recycledPct ?? "(vacío)"} % · {v.snapshot.supplier} · fuente: {v.snapshot.sourceFile}, línea {v.snapshot.sourceLine}{v.snapshot.origin === "simulated" ? " · SIMULADO" : ""}</div>
                        )}
                        <div className="text-xs text-slate-600">{d ? `Decisión: ${label(d.choice)}${d.bulk ? " (en bloque)" : ""}. Motivo: ${d.reason}` : "Aprobada en la base sin excepción."}</div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
