import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createCycleAction, deleteAllDataAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const { data: cycles } = await supabase.from("cycles").select("id,number,name,status,simulated,created_at").order("number", { ascending: true });
  const list = cycles ?? [];
  const hasApproved = list.some((c) => c.status === "approved");
  return (
    <Shell email={user.email} wide>
      <h1 className="text-2xl font-bold">Tus ciclos</h1>
      {sp.deleted && <p className="mt-2 rounded-md bg-green-50 p-3 text-sm text-green-900">Se borraron todos tus datos.</p>}
      <p className="mt-2 text-slate-700">
        Un ciclo es una ronda de datos de empaques de tus proveedores. El primero se aprueba como base; en el segundo Cuadre te muestra qué cambió y te pide decidir cada diferencia con un motivo.
      </p>

      {list.length === 0 ? (
        <div className="mt-6 rounded-md border bg-white p-4 text-sm text-slate-700">
          Todavía no tienes ciclos. Crea el primero (puedes usar la base simulada: datos inventados y marcados como SIMULADO).
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-md border bg-white">
          {list.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/ciclos/${c.id}`} className="font-semibold text-blue-800 hover:underline">Ciclo {c.number}: {c.name}</Link>
                <div className="mt-1 flex gap-2 text-xs">
                  <span className={`rounded px-2 py-0.5 ${c.status === "approved" ? "bg-green-100 text-green-900" : "bg-slate-100 text-slate-700"}`}>{c.status === "approved" ? "Aprobado" : "Borrador"}</span>
                  {c.simulated && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">Incluye datos SIMULADOS</span>}
                </div>
              </div>
              <Button asChild variant="outline" size="sm"><Link href={`/ciclos/${c.id}`}>Abrir</Link></Button>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 rounded-md border bg-white p-4">
        <h2 className="font-semibold">Nuevo ciclo</h2>
        <ActionForm action={createCycleAction} submit="Crear ciclo" className="mt-2">
          <label className="block text-sm">
            Nombre
            <input name="name" required maxLength={60} placeholder="Por ejemplo: 2026 T4" className="mt-1 block w-full max-w-sm rounded-md border border-slate-300 p-2" />
          </label>
        </ActionForm>
        {list.some((c) => c.status === "draft") && <p className="mt-2 text-xs text-slate-600">Tienes un borrador abierto: apruébalo antes de empezar el siguiente ciclo, para que sea tu base.</p>}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        {hasApproved && <Button asChild variant="outline"><Link href="/historial">Ver historial por componente</Link></Button>}
      </div>

      <section className="mt-10 rounded-md border border-red-200 bg-red-50 p-4">
        <h2 className="font-semibold text-red-900">Borrar todos mis datos</h2>
        <p className="mt-1 text-sm text-red-900">Borra tus ciclos, filas, decisiones, versiones y permisos. No se puede deshacer.</p>
        <form action={deleteAllDataAction} className="mt-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" required /> Entiendo que se borra todo</label>
          <Button type="submit" variant="destructive" className="mt-2">Borrar todos mis datos</Button>
        </form>
      </section>
    </Shell>
  );
}
