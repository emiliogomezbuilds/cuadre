import { Shell } from "@/components/shell";

export default function AboutPage() {
  return (
    <Shell>
      <h1 className="text-3xl font-bold">Quién necesita esto, quién pagaría y si es 10 veces mejor</h1>
      <p className="mt-2 text-sm text-slate-500">
        Esta página dice lo que está probado y lo que todavía no, igual que <code>VERDICT_EmilioGomez.pdf</code>.
      </p>

      <h2 className="mt-8 text-xl font-semibold">La necesidad</h2>
      <p className="mt-2 text-slate-700">
        Una persona que reúne datos de empaque de varios proveedores, en Excel y fotos de etiquetas, sin ERP, y que tiene que
        decidir qué hacer cuando un proveedor cambia un dato de un ciclo al siguiente, sin perder el porqué de cada decisión.
      </p>
      <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Estado real de esta necesidad: abierta.</strong> Hoy no tengo el nombre de una persona real que haya sentido
        esto este mes. La única «usuaria» que probó Cuadre hasta ahora es Ximena, un persona interpretado por un modelo en
        un chat nuevo. Esta semana voy a pedir a mi red un nombre real; si llega, esta página se actualiza.
      </div>

      <h2 className="mt-8 text-xl font-semibold">Quién pagaría</h2>
      <p className="mt-2 text-slate-700">
        Hoy, nadie confirmado. El reglamento mexicano que crearía la obligación de reportar empaque seguía sin publicarse
        en la nota de prensa más reciente que encontré (30 de agosto de 2026; no revisé el Diario Oficial). La prueba que
        el Blueprint del equipo pide, 15 contactos calificados, 5 muestras usables y 3 pilotos pagados, no se ha hecho.
      </p>

      <h2 className="mt-8 text-xl font-semibold">El caso 10 a 1</h2>
      <p className="mt-2 text-slate-700">
        No cumplido todavía. La alternativa de hoy es una hoja de cálculo o herramientas como Recyda o Specright. Nunca
        cronometré un segundo ciclo contra una hoja de cálculo real. Se cumpliría si el segundo ciclo de una persona real
        toma una décima parte del tiempo, o cuesta una décima parte, de lo que le toma hoy.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Lo que sí está construido hoy</h2>
      <p className="mt-2 text-slate-700">
        El motor del método: ninguna fila propuesta por IA se acepta si su cita no aparece palabra por palabra en el texto
        fuente, una afirmación de contenido reciclado sin evidencia se exporta vacía y marcada «sin sustento», y cada
        aprobación agrega una versión nueva sin borrar ni editar las anteriores. Esto corre en código, no es una promesa.
      </p>
    </Shell>
  );
}
