import { Shell } from "@/components/shell";
import { ANCHOR_DISCLOSURE } from "@/lib/pricing";

export default function AboutPage() {
  return (
    <Shell>
      <h1 className="text-3xl font-bold">Quién necesita esto, quién pagaría y si es 10 veces mejor</h1>
      <p className="mt-2 text-sm text-slate-500">
        Esta página dice lo que está probado y lo que todavía no, igual que <code>VERDICT_EmilioGomez.pdf</code> y{" "}
        <code>BRIEF_EmilioGomez.pdf</code> (Week 14, lente Dinero).
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

      <h2 className="mt-8 text-xl font-semibold">Quién pagaría — el hallazgo de esta semana</h2>
      <p className="mt-2 text-slate-700">
        Sin pagador doméstico confirmado todavía: el Reglamento de la Ley General de Economía Circular (publicada el 19 de
        enero de 2026) incumplió su plazo de 180 días a mediados de julio y seguía «en proceso» en la confirmación más
        reciente que encontré (finales de agosto de 2026). No existe hoy una multa mexicana que obligue a nadie a pagar por
        esto.
      </p>
      <p className="mt-2 text-slate-700">
        Pero hay una palanca de urgencia que no depende de México: un importador o productor que exporta a la Unión Europea
        ya enfrenta obligaciones del PPWR en vigor desde el 12 de agosto de 2026, y uno que exporta a California enfrenta el
        reglamento de SB 54, finalizado por CalRecycle en mayo de 2026. Ese comprador en Hamburgo o Los Ángeles puede exigir
        documentación hoy, sin esperar a ningún Reglamento mexicano. Esa es la diferencia real entre los dos segmentos de
        <code>/pricing</code>: uno tiene una razón presente para actuar, el otro no.
      </p>
      <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        {ANCHOR_DISCLOSURE}
      </div>
      <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Alcance honesto: un segmento probado, el otro todavía asumido.</strong> Una sola conversación con un
        posible pagador no valida los dos segmentos a la vez. Si esa persona resulta ser de mercado doméstico, tengo dato
        real sobre el segmento débil y cero dato real sobre el segmento con urgencia de exportación — y viceversa. Esta
        página dirá, después de esa conversación, cuál segmento quedó probado y cuál sigue siendo un supuesto.
      </div>

      <h2 className="mt-8 text-xl font-semibold">El caso 10 a 1</h2>
      <p className="mt-2 text-slate-700">
        No cumplido todavía. La alternativa de hoy es una hoja de cálculo o herramientas como Recyda o Specright. Nunca
        cronometré un segundo ciclo contra una hoja de cálculo real. Se cumpliría si el segundo ciclo de una persona real
        toma una décima parte del tiempo, o cuesta una décima parte, de lo que le toma hoy. El 10 a 1 es una medición por
        hacer, no un resultado que ya tengo (<code>docs/CHARTER.md</code>, NORTH STAR).
      </p>

      <h2 className="mt-8 text-xl font-semibold">Lo que sí está construido hoy</h2>
      <p className="mt-2 text-slate-700">
        El motor del método: ninguna fila propuesta por IA se acepta si su cita no aparece palabra por palabra en el texto
        fuente, una afirmación de contenido reciclado sin evidencia se exporta vacía y marcada «sin sustento», y cada
        aprobación agrega una versión nueva sin borrar ni editar las anteriores. Esto corre en código, no es una promesa.
        Lo mismo aplica al precio: las bandas y el simulador en <code>/pricing</code> corren en código, y cada archivo
        exportado lleva, en cada fila, el aviso de que es soporte de evidencia y no una declaración de conformidad —
        verificado por un chequeo que falla el build si esa línea falta, no solo escrito en esta página.
      </p>
    </Shell>
  );
}
