import { optionalUser } from "@/lib/session";
import { Shell } from "@/components/shell";
import { PricingSimulator } from "@/components/pricing-simulator";
import { deleteScenarioAction } from "@/app/actions";
import { ANCHOR_DISCLOSURE, BANDS, SEGMENT_LABEL, type Segment } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const mxn = (n: number) => Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

type ScenarioRow = {
  id: string; name: string; segment: Segment; band_id: string; customers: number; cycles_per_year: number;
  annual_mxn: number; monthly_mxn: number; created_at: string;
};

export default async function PricingPage() {
  const { supabase, user } = await optionalUser();
  let scenarios: ScenarioRow[] = [];
  if (user) {
    const { data } = await supabase.from("scenarios").select("id,name,segment,band_id,customers,cycles_per_year,annual_mxn,monthly_mxn,created_at").order("created_at", { ascending: false }).limit(20);
    scenarios = (data ?? []) as ScenarioRow[];
  }

  return (
    <Shell email={user?.email} wide>
      <h1 className="text-2xl font-bold">Precio: una oferta probada, no un precio inventado</h1>

      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        {ANCHOR_DISCLOSURE}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-green-300 bg-green-50 p-4">
          <p className="font-semibold text-green-900">{SEGMENT_LABEL.export}</p>
          <p className="mt-1 text-sm text-green-900">Tiene una razón real y presente para actuar: su comprador ya exige esta documentación.</p>
        </div>
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">{SEGMENT_LABEL.domestic}</p>
          <p className="mt-1 text-sm text-amber-900">Sin obligación mexicana publicada todavía (el Reglamento de la Ley de Economía Circular sigue pendiente).</p>
        </div>
      </div>

      <div className="mt-6 rounded-md border bg-white p-4">
        <h2 className="font-semibold">Bandas por valor declarado del embarque o ciclo</h2>
        <p className="mt-1 text-sm text-slate-600">No por frecuencia de uso: el precio sigue lo que está en riesgo, no cuántas veces entras a Cuadre.</p>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="py-2">Banda</th><th className="py-2">Precio por ciclo</th></tr></thead>
          <tbody>
            {BANDS.map((b) => (
              <tr key={b.id} className="border-b"><td className="py-2">{b.label}</td><td className="py-2 font-medium">{mxn(b.priceMXNPerCycle)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <PricingSimulator signedIn={!!user} />
      </div>

      {user && (
        <div className="mt-6 rounded-md border bg-white p-4">
          <h2 className="font-semibold">Tus escenarios guardados</h2>
          {scenarios.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Todavía no guardas ningún escenario.</p>
          ) : (
            <ul className="mt-2 divide-y">
              {scenarios.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-slate-500">{SEGMENT_LABEL[s.segment]} · {s.customers} clientes · {s.cycles_per_year} ciclos/año/cliente · {mxn(s.monthly_mxn)}/mes · {mxn(s.annual_mxn)}/año</p>
                  </div>
                  <form action={deleteScenarioAction}>
                    <input type="hidden" name="scenario_id" value={s.id} />
                    <button type="submit" className="text-xs text-red-700 hover:underline">Borrar</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-8 text-xs text-slate-500">
        Cada archivo exportado por Cuadre lleva, en cada fila, el aviso «soporte de evidencia, no es una declaración de conformidad» — no es solo texto en esta página, una verificación del build falla si algún archivo exportado no lo tiene.
      </p>
    </Shell>
  );
}
