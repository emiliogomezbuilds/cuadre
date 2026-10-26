import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuadre",
  description:
    "Concilia los datos de empaques de tus proveedores entre un ciclo y el siguiente. Cada cambio se decide con un motivo y queda en el historial. No calcula cuotas ni presenta declaraciones.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
