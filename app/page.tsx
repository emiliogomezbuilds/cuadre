import Link from "next/link";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <Shell>
      <h1 className="text-3xl font-bold">Cuadre</h1>
      <p className="mt-3 text-lg text-slate-700">
        Concilia los datos de empaques de tus proveedores de un ciclo al siguiente. Cada cambio se decide con un motivo, queda en un historial que no se borra y se exporta con su fuente.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-slate-700">
        <li>Importa el archivo del ciclo 1 y apruébalo como base.</li>
        <li>Importa el ciclo 2: Cuadre te muestra qué coincide solo y qué necesita una decisión tuya.</li>
        <li>Verás cuánto trabajo manual costó el ciclo y qué datos Cuadre no tiene.</li>
      </ul>
      <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Lo que Cuadre no hace.</strong> No calcula cuotas, no presenta declaraciones ante ninguna autoridad y no da asesoría legal: el reglamento de la Ley General de Economía Circular no estaba publicado en las fuentes que revisé. Tampoco verifica que algo se haya reciclado. Una cifra de contenido reciclado sin documento de respaldo se exporta como «sin sustento».
      </div>
      <div className="mt-8 flex gap-3">
        <Button asChild size="lg"><Link href="/login">Entrar con Google</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/limites">Ver límites</Link></Button>
      </div>
      <p className="mt-6 text-xs text-slate-500">Demostración con datos inventados. No subas información real de personas ni de empresas.</p>
    </Shell>
  );
}
