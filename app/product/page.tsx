import Link from "next/link";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";

export default function ProductPage() {
  return (
    <Shell>
      <h1 className="text-3xl font-bold">El producto</h1>
      <p className="mt-3 text-slate-700">
        Cuadre reconcilia los datos de empaques de una importadora o productora con lo que sus proveedores le mandaron antes.
        Cuando algo cambia de un ciclo al siguiente, una persona decide y escribe por qué; nada se sobrescribe; y cada cifra
        exportada carga su propio estado en la misma celda.
      </p>

      <h2 className="mt-8 text-xl font-semibold">La característica central (lo único que funciona esta semana)</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-700">
        <li>Importas el archivo del ciclo 1 y lo apruebas como base.</li>
        <li>Importas el archivo del ciclo 2. Cuadre compara cada componente con la base aprobada.</li>
        <li>Cada diferencia necesita una decisión con un motivo de 5 a 300 caracteres; no hay opción por defecto.</li>
        <li>Al aprobar, cada cambio queda como una nueva versión. Las versiones anteriores nunca se borran ni se editan.</li>
        <li>Exportas el archivo de evidencia: cada valor viaja junto con su estado, en la misma línea.</li>
      </ol>

      <h2 className="mt-8 text-xl font-semibold">Lo que corté esta semana</h2>
      <p className="mt-2 text-slate-700">
        Las propuestas por IA desde texto o foto de etiqueta y la alimentación simulada de proveedores existen en el código
        de la semana pasada, pero quedan fuera de esta pantalla a propósito (ver <code>docs/PACKET.md</code>, sección 10).
        Una sola cosa, bien hecha, esta semana.
      </p>

      <div className="mt-8 flex gap-3">
        <Button asChild size="lg"><Link href="/login">Entrar con Google</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/about">Quién paga y el caso 10 a 1</Link></Button>
      </div>
    </Shell>
  );
}
