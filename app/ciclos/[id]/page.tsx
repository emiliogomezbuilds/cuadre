import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { uuid } from "@/lib/validate";
import { loadCycle } from "@/lib/data";
import { effort } from "@/lib/effort";
import { NOT_AVAILABLE } from "@/lib/effort";
import { CHOICE_LABEL, allowedChoices, bulkEligible, pendingExceptions } from "@/lib/decisions";
import type { Exception } from "@/lib/engine";
import { ORIGIN_LABEL, SOURCE_KIND_LABEL, type InRow } from "@/lib/types";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { DecisionForm, type CandidateView } from "@/components/decision-form";
import { AiPhotoPanel, AiTextPanel } from "@/components/ai-panels";
import { approveAction, bulkDecideAction, clearRowsAction, importCsvAction, simFeedAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const FLAG_LABEL: Record<string, string> = {
  missing: "Falta información", invalid: "Valor no válido", unknown_material: "Material no reconocido",
  unsupported_claim: "Afirmación sin sustento", double_count: "Posible doble conteo (no verificado)", paper_source: "Registro no digital: revisión humana",
};
const KIND_LABEL: Record<string, string> = { changed: "Cambió", new: "Nuevo", removed: "Ya no aparece", conflict: "Filas repetidas distintas", flag_only: "Con alerta" };

const view = (r: InRow): CandidateView => ({
  sku: r.sku, component: r.component, material: r.material || "(vacío)", weight: r.weightG === null ? "(vacío)" : String(r.weightG),
  recycled: r.recycledPct === null ? "(vacío)" : String(r.recycledPct), supplier: r.supplier || "(vacío)",
  evidence: r.evidenceRef ?? "(sin referencia)", source: `${r.sourceFile}, línea ${r.sourceLine}`, origin: ORIGIN_LABEL[r.origin],
});

function Candidate({ r, n }: { r: InRow; n?: number }) {
  const v = view(r);
  return (
    <div className="rounded border bg-slate-50 p-2 text-xs">
      {n !== undefined && <div className="font-semibold">Fila {n}</div>}
      <div>{v.material} · {v.weight} g · reciclado {v.recycled} % · {v.supplier} · evidencia: {v.evidence}</div>
      <div className="text-slate-600">
        Fuente: {v.source} · {v.origin}{r.sourceKind ? ` · ${SOURCE_KIND_LABEL[r.sourceKind]}` : ""}
      </div>
      {r.quote && <div className="text-slate-600">Cita de la IA: «{r.quote}»</div>}
    </div>
  );
}

function ExceptionCard({ ex, cycleId, draft, decided }: { ex: Exception; cycleId: string; draft: boolean; decided: { choice: string; reason: string; bulk: boolean } | null }) {
  const choices = allowedChoices(ex).map((c) => ({ value: c, label: CHOICE_LABEL(ex, c) }));
  return (
    <li id={`ex-${encodeURIComponent(ex.key)}`} className={`rounded-md border bg-white p-4 ${decided ? "border-green-300" : "border-slate-300"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{ex.sku || "(sin SKU)"} · {ex.component}</h3>
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-900">{KIND_LABEL[ex.kind]}</span>
        {ex.large && ex.kind === "changed" && <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">Cambio grande</span>}
        {bulkEligible(ex) && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">Cambio menor</span>}
        {ex.flags.map((f) => <span key={f} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{FLAG_LABEL[f]}</span>)}
      </div>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700">{ex.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
      {ex.diffs.length > 0 && (
        <table className="mt-2 w-full max-w-md text-xs">
          <thead><tr className="text-left text-slate-500"><th>Campo</th><th>Antes (v{ex.previous?.version})</th><th>Ahora</th></tr></thead>
          <tbody>{ex.diffs.map((d) => <tr key={d.field}><td className="pr-3">{d.field}</td><td className="pr-3">{d.from}</td><td className="font-medium">{d.to}</td></tr>)}</tbody>
        </table>
      )}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {ex.previous && (
          <div className="rounded border bg-slate-50 p-2 text-xs">
            <div className="font-semibold">Valor aprobado (versión {ex.previous.version})</div>
            <div>{ex.previous.material} · {ex.previous.weightG ?? "(vacío)"} g · reciclado {ex.previous.recycledPct ?? "(vacío)"} % · {ex.previous.supplier}</div>
          </div>
        )}
        {ex.candidates.map((r, i) => <Candidate key={i} r={r} n={ex.candidates.length > 1 ? i + 1 : undefined} />)}
      </div>
      {decided && (
        <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-900">
          Decisión: <strong>{CHOICE_LABEL(ex, decided.choice as never)}</strong>{decided.bulk ? " (en bloque)" : ""}. Motivo: {decided.reason}
        </p>
      )}
      {draft && !decided && <DecisionForm cycleId={cycleId} exKey={ex.key} choices={choices} candidates={ex.candidates.map(view)} />}
      {draft && decided && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-blue-800">Cambiar la decisión (queda registrada como una decisión nueva)</summary>
          <DecisionForm cycleId={cycleId} exKey={ex.key} choices={choices} candidates={ex.candidates.map(view)} submit="Guardar la nueva decisión" />
        </details>
      )}
    </li>
  );
}

export default async function CyclePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;
  if (!uuid(id)) notFound();
  const st = await loadCycle(supabase, id);
  if (!st) notFound();
  const { cycle, rec, decisions, baseline, incoming } = st;
  const draft = cycle.status === "draft";
  const eff = effort(rec, decisions, cycle.first_import_at, cycle.approved_at);
  const pending = pendingExceptions(rec, decisions);
  const bulkTargets = rec.exceptions.filter((e) => bulkEligible(e) && !decisions.has(e.key));
  const byFile = new Map<string, number>();
  incoming.forEach((r) => byFile.set(r.sourceFile, (byFile.get(r.sourceFile) ?? 0) + 1));
  const ordered = [...rec.exceptions].sort((a, b) => Number(decisions.has(a.key)) - Number(decisions.has(b.key)) || (a.key < b.key ? -1 : 1));
  const baselineMode = rec.mode === "baseline";
  const removedCount = rec.exceptions.filter((e) => e.kind === "removed").length;

  return (
    <Shell email={user.email} wide>
      <p className="text-sm"><Link href="/dashboard" className="text-blue-800 hover:underline">← Tus ciclos</Link></p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Ciclo {cycle.number}: {cycle.name}</h1>
        <span className={`rounded px-2 py-0.5 text-xs ${draft ? "bg-slate-200" : "bg-green-100 text-green-900"}`}>{draft ? "Borrador" : "Aprobado"}</span>
        {cycle.simulated && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Incluye datos SIMULADOS (inventados)</span>}
      </div>
      <p className="mt-2 text-slate-700">
        {baselineMode
          ? "Este es el primer ciclo: lo que apruebes aquí será la base (versión 1 de cada componente)."
          : `Se compara con el ciclo aprobado anterior (${baseline.size} componentes vigentes).`}
      </p>
      {draft && !baselineMode && incoming.length > 0 && removedCount * 2 >= baseline.size && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Atención: este archivo no trae {removedCount} de los {baseline.size} componentes del ciclo anterior, y cada uno aparece abajo como «Ya no aparece». ¿Es un archivo parcial? Si es así, vacía las filas e importa el archivo completo antes de decidir.
        </p>
      )}

      {draft && (
        <section className="mt-6 rounded-md border bg-white p-4">
          <h2 className="font-semibold">1. Trae los datos del ciclo</h2>
          <p className="mt-1 text-sm text-slate-600">
            CSV con las columnas sku, componente, material, peso_g y, si las tienes, reciclado_pct, proveedor, evidencia y fuente_tipo. Usa datos inventados.
            {incoming.length > 0 && <> Ya hay {incoming.length} filas: {[...byFile].map(([f, n]) => `${f} (${n})`).join("; ")}.</>}
          </p>
          <ActionForm action={importCsvAction} submit="Importar CSV" className="mt-3 space-y-2">
            <input type="hidden" name="cycle_id" value={cycle.id} />
            <input type="file" name="file" accept=".csv,text/csv" className="block text-sm" />
            <label className="block text-sm">o pega el contenido
              <textarea name="csv_text" rows={3} className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-xs" />
            </label>
          </ActionForm>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">Alimentación SIMULADA de proveedores (inventada)</p>
              <p className="text-xs text-amber-900">Empresa y proveedores ficticios. Cada fila queda marcada SIMULADO en pantalla y en la exportación.</p>
              <div className="flex flex-wrap gap-2">
                <ActionForm action={simFeedAction} submit="Cargar base simulada (ciclo 1)" variant="outline">
                  <input type="hidden" name="cycle_id" value={cycle.id} /><input type="hidden" name="which" value="baseline" />
                </ActionForm>
                <ActionForm action={simFeedAction} submit="Recibir actualización simulada (ciclo 2)" variant="outline">
                  <input type="hidden" name="cycle_id" value={cycle.id} /><input type="hidden" name="which" value="update" />
                </ActionForm>
              </div>
            </div>
            <div className="space-y-2">
              <details className="rounded border bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold">Ayuda con IA: texto del proveedor (opcional)</summary><div className="mt-2"><AiTextPanel cycleId={cycle.id} /></div></details>
              <details className="rounded border bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold">Ayuda con IA: foto de una etiqueta (opcional)</summary><div className="mt-2"><AiPhotoPanel cycleId={cycle.id} /></div></details>
            </div>
          </div>
          {incoming.length > 0 && (
            <form action={clearRowsAction} className="mt-3">
              <input type="hidden" name="cycle_id" value={cycle.id} />
              <Button type="submit" variant="outline" size="sm">Vaciar las filas de este borrador</Button>
            </form>
          )}
        </section>
      )}

      {incoming.length > 0 && (
        <>
          <section className="mt-6 rounded-md border bg-white p-4">
            <h2 className="font-semibold">Esfuerzo manual de este ciclo</h2>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex justify-between"><dt>Filas importadas</dt><dd className="font-medium">{eff.rowsImported}</dd></div>
              <div className="flex justify-between"><dt>{baselineMode ? "Listas sin alertas" : "Coinciden sin intervención"}</dt><dd className="font-medium">{eff.matchedAutomatically}</dd></div>
              <div className="flex justify-between"><dt>Requieren decisión humana</dt><dd className="font-medium">{eff.exceptions}</dd></div>
              <div className="flex justify-between"><dt>Decisiones tomadas</dt><dd className="font-medium">{eff.decided} de {eff.exceptions} ({eff.decidedByHand} una por una, {eff.decidedInBulk} en bloque)</dd></div>
              <div className="flex justify-between"><dt>Datos pedidos a proveedores</dt><dd className="font-medium">{eff.openSupplierRequests}</dd></div>
              <div className="flex justify-between"><dt>Tiempo desde la primera importación</dt><dd className="font-medium">{eff.elapsedMinutes === null ? "—" : `${eff.elapsedMinutes} min`}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-slate-600">Revisión: por una sola persona (quien decide también aprueba).</p>
            <details className="mt-2 text-sm"><summary className="cursor-pointer text-blue-800">Lo que Cuadre no tiene</summary>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">{NOT_AVAILABLE.map((t) => <li key={t}>{t}</li>)}</ul>
            </details>
          </section>

          {draft && bulkTargets.length > 0 && (
            <section className="mt-6 rounded-md border bg-white p-4">
              <h2 className="font-semibold">Cambios menores ({bulkTargets.length})</h2>
              <p className="mt-1 text-sm text-slate-600">Cambios de peso menores al 10 %, sin alertas. Puedes decidirlos uno por uno abajo o aceptarlos juntos con un motivo compartido. Quedan marcados «en bloque».</p>
              <ActionForm action={bulkDecideAction} submit={`Aceptar ${bulkTargets.length} cambios menores`} variant="outline" className="mt-2 space-y-2">
                <input type="hidden" name="cycle_id" value={cycle.id} />
                <ul className="list-disc pl-5 text-sm">{bulkTargets.map((e) => <li key={e.key}>{e.sku || "(sin SKU)"} · {e.component}: {e.diffs.map((d) => `${d.field} ${d.from} → ${d.to}`).join(", ")}</li>)}</ul>
                <label className="block text-sm">Motivo compartido
                  <input name="reason" required minLength={5} maxLength={300} className="mt-1 w-full rounded-md border border-slate-300 p-2" placeholder="Por ejemplo: revisé las fichas y coinciden" />
                </label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm_bulk" /> Revisé esos cambios</label>
              </ActionForm>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-lg font-semibold">{baselineMode ? "2. Filas con alertas" : "2. Excepciones"} ({rec.exceptions.length})</h2>
            {rec.exceptions.length === 0 ? (
              <p className="mt-2 rounded-md border bg-white p-4 text-sm text-slate-700">No hay excepciones: todo {baselineMode ? "está listo para aprobarse como base" : "coincide con el ciclo anterior"}.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {ordered.map((e) => {
                  const d = decisions.get(e.key);
                  return <ExceptionCard key={e.key} ex={e} cycleId={cycle.id} draft={draft} decided={d ? { choice: d.choice, reason: d.reason, bulk: d.bulk } : null} />;
                })}
              </ul>
            )}
          </section>

          <section className="mt-8 rounded-md border bg-white p-4">
            <h2 className="font-semibold">3. Aprobar el ciclo</h2>
            {draft ? (
              pending.length > 0 ? (
                <p className="mt-2 text-sm text-slate-700">Faltan {pending.length} decisiones. Cuadre no deja aprobar hasta que cada excepción tenga una decisión y un motivo.</p>
              ) : (
                <ActionForm action={approveAction} submit="Aprobar ciclo" className="mt-2">
                  <input type="hidden" name="cycle_id" value={cycle.id} />
                  <p className="text-sm text-slate-700">Se agregarán versiones nuevas; las anteriores no se modifican ni se borran. En esta versión quien decide también aprueba: la exportación dirá «revisión por una sola persona».</p>
                  <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="confirm_approve" /> Confirmo la aprobación</label>
                </ActionForm>
              )
            ) : (
              <div className="mt-2 text-sm text-slate-700">
                <p>Aprobado el {cycle.approved_at ? new Date(cycle.approved_at).toLocaleString("es-MX") : ""}. Revisión por una sola persona.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild><a href={`/ciclos/${cycle.id}/exportar/evidencia`}>Descargar evidencia (CSV)</a></Button>
                  <Button asChild variant="outline"><a href={`/ciclos/${cycle.id}/exportar/decisiones`}>Descargar bitácora de decisiones (CSV)</a></Button>
                  <Button asChild variant="outline"><Link href="/historial">Ver historial por componente</Link></Button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
