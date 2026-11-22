"use client";
import { ActionForm } from "@/components/action-form";
import { submitSignupAction } from "@/app/actions";

export function ContactForm({ source }: { source: "linkedin_cold" | "other" }) {
  return (
    <ActionForm action={submitSignupAction} submit="Quiero que me contacten" className="mt-4 space-y-3">
      <input type="hidden" name="source" value={source} />
      <label className="block text-sm">
        Nombre
        <input name="name" required maxLength={80} placeholder="Ej. Mauricio Sánchez" className="mt-1 block w-full rounded-md border border-slate-300 p-2" />
      </label>
      <label className="block text-sm">
        Cómo contactarte (correo o WhatsApp)
        <input name="contact" required maxLength={120} placeholder="Ej. mauricio@empresa.mx" className="mt-1 block w-full rounded-md border border-slate-300 p-2" />
      </label>
      <label className="block text-sm">
        Tu rol (opcional)
        <input name="role_title" maxLength={80} placeholder="Ej. Comercio exterior / Control de inventario" className="mt-1 block w-full rounded-md border border-slate-300 p-2" />
      </label>
      <label className="block text-sm">
        Cuéntanos qué pasó (opcional)
        <textarea name="message" maxLength={300} rows={3} placeholder="Ej. Se detuvo un embarque por un dato que no cuadraba..." className="mt-1 block w-full rounded-md border border-slate-300 p-2" />
      </label>
    </ActionForm>
  );
}
