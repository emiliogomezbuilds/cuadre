import { Shell } from "@/components/shell";
import { NOT_AVAILABLE } from "@/lib/effort";

export default function Limites() {
  return (
    <Shell>
      <h1 className="text-2xl font-bold">Qué hace Cuadre y qué no</h1>
      <p className="mt-3 text-slate-700">
        Cuadre compara el archivo de un ciclo con el ciclo aprobado anterior, te muestra las diferencias, pide que decidas cada una con un motivo y guarda cada versión. Es una herramienta de orden y registro, no de cumplimiento.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Datos que Cuadre no tiene</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
        {NOT_AVAILABLE.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h2 className="mt-6 text-lg font-semibold">Lo que no afirma</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
        <li>No afirma que un material se haya reciclado. Una referencia de evidencia es un dato que el proveedor declara; Cuadre no la verifica.</li>
        <li>«Sin sustento» significa que no hay documento de respaldo en el archivo. No significa que el dato sea falso ni es un juicio sobre el proveedor.</li>
        <li>«Posible doble conteo» es una alerta de que la misma referencia aparece en más de un lugar. No está verificado.</li>
        <li>Las categorías de material son internas de Cuadre. No son las categorías oficiales: el reglamento no estaba publicado en las fuentes que revisé.</li>
        <li>Cuadre no guarda datos de recolectores ni de otras personas trabajadoras, y rechaza archivos con columnas sobre ellas.</li>
      </ul>
      <h2 className="mt-6 text-lg font-semibold">Revisión</h2>
      <p className="mt-2 text-slate-700">
        En esta versión cada cuenta tiene un solo usuario, así que quien decide también aprueba. Cada exportación lo dice: «revisión por una sola persona». Lo ideal es que otra persona revise.
      </p>
    </Shell>
  );
}
