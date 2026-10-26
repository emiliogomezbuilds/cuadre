"use client";
import { decideAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";

export interface ChoiceOption { value: string; label: string }
export interface CandidateView { sku: string; component: string; material: string; weight: string; recycled: string; supplier: string; evidence: string; source: string; origin: string }

/** One decision. Nothing is pre-selected: a default is what a tired reviewer accepts. */
export function DecisionForm({
  cycleId, exKey, choices, candidates, submit = "Guardar decisión",
}: { cycleId: string; exKey: string; choices: ChoiceOption[]; candidates: CandidateView[]; submit?: string }) {
  const many = candidates.length > 1;
  return (
    <ActionForm action={decideAction} submit={submit} className="mt-3 space-y-3">
      <input type="hidden" name="cycle_id" value={cycleId} />
      <input type="hidden" name="key" value={exKey} />
      <fieldset>
        <legend className="text-sm font-medium">¿Qué decides?</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {choices.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50">
              <input type="radio" name="choice" value={c.value} required />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      {many && (
        <fieldset>
          <legend className="text-sm font-medium">Si aceptas, ¿cuál de las filas repetidas?</legend>
          <div className="mt-1 space-y-1">
            {candidates.map((c, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input type="radio" name="pick" value={i} />
                Fila {i + 1}: {c.weight} g · {c.material} · {c.supplier} ({c.source})
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="block text-sm font-medium">
        Motivo (obligatorio, 5 a 300 caracteres)
        <textarea name="reason" required minLength={5} maxLength={300} rows={2} className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm font-normal" placeholder="Por qué decides esto: quedará en el historial" />
      </label>
    </ActionForm>
  );
}
