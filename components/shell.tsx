import Link from "next/link";

export function Shell({ children, email, wide }: { children: React.ReactNode; email?: string | null; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href={email ? "/dashboard" : "/"} className="text-lg font-semibold">Cuadre</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/limites" className="text-slate-300 hover:underline">Límites</Link>
            <Link href="/privacidad" className="text-slate-300 hover:underline">Privacidad</Link>
            {email ? (
              <form action="/logout" method="post"><button className="text-slate-300 hover:underline">Salir</button></form>
            ) : (
              <Link href="/login" className="text-white hover:underline">Entrar</Link>
            )}
          </nav>
        </div>
      </header>
      <main className={`mx-auto px-4 py-8 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-slate-500">
        Cuadre ordena y registra datos que tus proveedores declaran. No calcula cuotas, no presenta declaraciones, no da asesoría legal y no verifica que algo se haya reciclado. Todos los datos de la demostración son inventados.
      </footer>
    </div>
  );
}
