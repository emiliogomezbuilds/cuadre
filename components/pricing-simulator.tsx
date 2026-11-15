"use client";
import { useMemo, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { saveScenarioAction } from "@/app/actions";
import { BANDS, SEGMENT_LABEL, projectRevenue, type Segment } from "@/lib/pricing";

const mxn = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export function PricingSimulator({ signedIn }: { signedIn: boolean }) {
  const [segment, setSegment] = useState<Segment>("export");
  const [bandId, setBandId] = useState(BANDS[0].id);
  const [customers, setCustomers] = useState(12);
  const [cycles, setCycles] = useState(4);

  const projection = useMemo(
    () => projectRevenue({ segment, bandId, customers, cyclesPerCustomerPerYear: cycles }),
    [segment, bandId, customers, cycles]
  );

  return (
    <div className="rounded-md border bg-white p-4">
      <h2 className="font-semibold">Simulador de ingresos</h2>
      <p className="mt-1 text-sm text-slate-600">Los supuestos quedan a la vista; nada se calcula en secreto.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Segmento
          <select value={segment} onChange={(e) => setSegment(e.target.value as Segment)} className="mt-1 block w-full rounded-md border border-slate-300 p-2">
            {(Object.keys(SEGMENT_LABEL) as Segment[]).map((s) => <option key={s} value={s}>{SEGMENT_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          Banda de valor declarado
          <select value={bandId} onChange={(e) => setBandId(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 p-2">
            {BANDS.map((b) => <option key={b.id} value={b.id}>{b.label} — {mxn(b.priceMXNPerCycle)}/ciclo</option>)}
          </select>
        </label>
        <label className="block text-sm">
          Clientes (empresas pagando)
          <input type="number" min={0} max={100000} value={customers} onChange={(e) => setCustomers(Number(e.target.value) || 0)} className="mt-1 block w-full rounded-md border border-slate-300 p-2" />
        </label>
        <label className="block text-sm">
          Ciclos por cliente al año
          <input type="number" min={0} max={1000} step={1} value={cycles} onChange={(e) => setCycles(Number(e.target.value) || 0)} className="mt-1 block w-full rounded-md border border-slate-300 p-2" />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-blue-50 p-3">
          <p className="text-xs text-blue-900">Proyección mensual</p>
          <p className="text-xl font-semibold text-blue-900">{mxn(projection.monthlyMXN)}</p>
        </div>
        <div className="rounded-md bg-blue-50 p-3">
          <p className="text-xs text-blue-900">Proyección anual</p>
          <p className="text-xl font-semibold text-blue-900">{mxn(projection.annualMXN)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Precio por ciclo en esta banda: {mxn(projection.pricePerCycleMXN)}. Precio sigue el valor declarado del embarque o ciclo, no cuántas veces se usa Cuadre.</p>

      {signedIn ? (
        <ActionForm action={saveScenarioAction} submit="Guardar escenario" variant="outline" className="mt-4 space-y-2">
          <input type="hidden" name="segment" value={segment} />
          <input type="hidden" name="band_id" value={bandId} />
          <input type="hidden" name="customers" value={customers} />
          <input type="hidden" name="cycles_per_year" value={cycles} />
          <label className="block text-sm">
            Nombre del escenario
            <input name="name" required maxLength={60} placeholder="Por ejemplo: 12 clientes de exportación" className="mt-1 block w-full max-w-sm rounded-md border border-slate-300 p-2" />
          </label>
        </ActionForm>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          <a href="/login" className="text-blue-800 hover:underline">Inicia sesión</a> para guardar este escenario y volver a verlo después.
        </p>
      )}
    </div>
  );
}
