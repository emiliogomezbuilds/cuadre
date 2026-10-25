import { Shell } from "@/components/shell";

export default function Privacidad() {
  return (
    <Shell>
      <h1 className="text-2xl font-bold">Privacidad</h1>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
        <li>Entras con Google. Guardamos tu identificador de cuenta para que solo tú veas tus ciclos. No leemos tu correo ni tus archivos.</li>
        <li>Guardamos solo los ciclos, filas, decisiones y versiones que tú confirmas. Cada tabla tiene seguridad por fila: cada persona ve únicamente lo suyo.</li>
        <li>Las decisiones y versiones no se pueden editar ni borrar una por una: son un historial. Puedes borrar todos tus datos con «Borrar todos mis datos» en el panel.</li>
        <li>La ayuda con IA es opcional y pide tu permiso cada vez. El texto pegado y las fotos de etiquetas se procesan en memoria y no se guardan. Solo se guardan las filas que confirmes. La versión gratuita de Gemini puede usar lo que envías para mejorar sus productos: por eso solo debes usar datos inventados.</li>
        <li>No hay anuncios, ni venta de datos, ni calificaciones de proveedores o de personas.</li>
        <li>Esta es una demostración: usa únicamente datos inventados. No subas información real de empresas ni de personas.</li>
      </ul>
    </Shell>
  );
}
