import { Shell } from "@/components/shell";
import { ContactForm } from "@/components/contact-form";

export const dynamic = "force-dynamic";

export default async function ContactoPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;
  const source = src === "linkedin_cold" ? "linkedin_cold" : "other";

  return (
    <Shell>
      <h1 className="text-2xl font-bold">¿Tu último embarque se detuvo por un dato que no cuadraba?</h1>
      <p className="mt-2 text-slate-700">
        Si la lista de empaque no coincide con lo que llegó, alguien lo detiene — y normalmente lo descubres tarde.
        Cuéntanos qué pasó la última vez.
      </p>

      <div className="mt-6 max-w-lg rounded-md border bg-white p-5">
        <h2 className="font-semibold">Cuéntanos tu caso</h2>
        <p className="mt-1 text-sm text-slate-600">No necesitas crear una cuenta ni iniciar sesión para esto.</p>
        <ContactForm source={source} />
      </div>

      <p className="mt-6 max-w-lg text-xs text-slate-500">
        No calificamos cuotas ni ofrecemos asesoría legal. No verificamos que algo se haya reciclado. Cada registro
        queda con fecha y hora; no se usa para ningún otro fin.
      </p>
    </Shell>
  );
}
