"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { aiPhotoConfirmAction, aiPhotoProposeAction, aiTextConfirmAction, aiTextProposeAction, type AiPhotoState, type AiTextState } from "@/app/actions";
import { MATERIALS, SOURCE_KINDS, SOURCE_KIND_LABEL } from "@/lib/types";

const KindSelect = ({ name }: { name: string }) => (
  <select name={name} required defaultValue="" className="rounded-md border border-slate-300 bg-white p-1.5 text-sm">
    <option value="" disabled>Elige el tipo de fuente…</option>
    {SOURCE_KINDS.map((k) => <option key={k} value={k}>{SOURCE_KIND_LABEL[k]}</option>)}
  </select>
);

export function AiTextPanel({ cycleId }: { cycleId: string }) {
  const [state, formAction, pending] = useActionState(aiTextProposeAction, {} as AiTextState);
  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="cycle_id" value={cycleId} />
        <label className="block text-sm font-medium">
          Texto del proveedor (ficha técnica o correo)
          <textarea name="free_text" required minLength={20} maxLength={4000} rows={5} className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm font-normal" placeholder="Pega aquí un texto inventado de prueba, por ejemplo: Ficha de Envases Delta. SKU LIM-500, componente Botella, material PET, peso 21.0 g, contenido reciclado 0%." />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent_ai" required className="mt-1" />
          <span>Permito enviar este texto a Google Gemini (versión gratuita, que puede usar lo que envía para mejorar sus productos). Es texto inventado, sin datos reales.</span>
        </label>
        <Button type="submit" variant="outline" disabled={pending}>{pending ? "Leyendo…" : "Proponer filas con IA"}</Button>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      </form>

      {state.rows && (
        <div className="rounded-md border border-purple-300 bg-purple-50 p-3">
          <p className="text-sm font-semibold text-purple-900">Propuesto por IA: confirma cada fila</p>
          <p className="text-xs text-purple-900">Solo quedan las filas cuya cita aparece palabra por palabra en tu texto. Nada se guarda hasta que marques «Confirmo» y elijas el tipo de fuente.</p>
          {state.dropped && state.dropped.length > 0 && (
            <p className="mt-1 text-xs text-slate-700">Descartadas por no pasar la revisión: {state.dropped.map((d) => `${d.sku || "?"} · ${d.component || "?"} (${d.reason})`).join("; ")}.</p>
          )}
          {state.rows.length === 0 ? (
            <p className="mt-2 text-sm">La IA no propuso ninguna fila que pase la revisión. Importa un CSV.</p>
          ) : (
            <ActionForm action={aiTextConfirmAction} submit="Agregar las filas confirmadas" className="mt-2 space-y-3">
              <input type="hidden" name="cycle_id" value={cycleId} />
              <input type="hidden" name="free_text" value={state.text} />
              <input type="hidden" name="rows_json" value={JSON.stringify(state.rows)} />
              {state.rows.map((r, i) => (
                <div key={i} className="rounded border border-purple-200 bg-white p-2 text-sm">
                  <div className="font-medium">{r.sku} · {r.component} · {r.material ?? "(sin material)"} · {r.weightG ?? "(sin peso)"} g · reciclado {r.recycledPct ?? "(no dice)"} % · {r.supplier || "(sin proveedor)"}{r.evidenceRef ? ` · ref. ${r.evidenceRef}` : ""}</div>
                  <div className="mt-1 text-xs text-slate-600">Cita: «{r.quote}»</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <KindSelect name={`kind_${i}`} />
                    <label className="flex items-center gap-2"><input type="checkbox" name={`confirm_${i}`} /> Confirmo esta fila</label>
                  </div>
                </div>
              ))}
            </ActionForm>
          )}
        </div>
      )}
    </div>
  );
}

export function AiPhotoPanel({ cycleId }: { cycleId: string }) {
  const [state, formAction, pending] = useActionState(aiPhotoProposeAction, {} as AiPhotoState);
  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="cycle_id" value={cycleId} />
        <label className="block text-sm font-medium">
          Foto de la etiqueta de un envase
          <input type="file" name="image" accept="image/png,image/jpeg,image/webp" required className="mt-1 block text-sm font-normal" />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent_ai" required className="mt-1" />
          <span>Permito enviar esta foto a Google Gemini (versión gratuita). Debe ser un envase de prueba, sin personas ni datos reales. La foto no se guarda.</span>
        </label>
        <Button type="submit" variant="outline" disabled={pending}>{pending ? "Leyendo…" : "Leer etiqueta con IA"}</Button>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      </form>
      {state.draft && (
        <div className="rounded-md border border-purple-300 bg-purple-50 p-3">
          <p className="text-sm font-semibold text-purple-900">Propuesto por IA: confirma</p>
          <p className="text-xs text-purple-900">La IA propone: material {state.draft.material ?? "(no se ve)"}, peso {state.draft.weightG ?? "(no se ve)"} g. Texto que dice haber leído: «{state.draft.quote || "(nada)"}». Escribe tú los datos: nada viene escrito de antemano.</p>
          <ActionForm action={aiPhotoConfirmAction} submit="Agregar esta fila" className="mt-2 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="cycle_id" value={cycleId} />
            <input type="hidden" name="quote" value={state.draft.quote} />
            <input name="sku" required maxLength={40} placeholder="SKU" className="rounded-md border border-slate-300 bg-white p-2 text-sm" />
            <input name="component" required maxLength={60} placeholder="Componente (Botella, Tapa…)" className="rounded-md border border-slate-300 bg-white p-2 text-sm" />
            <input name="supplier" required maxLength={80} placeholder="Proveedor" className="rounded-md border border-slate-300 bg-white p-2 text-sm" />
            <select name="material" required defaultValue="" className="rounded-md border border-slate-300 bg-white p-2 text-sm">
              <option value="" disabled>Material…</option>
              {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input name="weight_g" required inputMode="decimal" placeholder="Peso en gramos" className="rounded-md border border-slate-300 bg-white p-2 text-sm" />
            <KindSelect name="kind" />
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="confirm_photo" /> Confirmo que revisé estos datos</label>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
