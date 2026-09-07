import type { Metadata } from "next";
import "./globals.css";
import "./studio.css";
import "./workflow-live.css";

export const metadata: Metadata = {
  title: { default: "Nexo · Sala editorial IA", template: "%s · Nexo" },
  description: "Sistema editorial interno para detectar, investigar, adaptar y aprobar contenidos con trazabilidad.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-GT"><body>{children}</body></html>;
}
