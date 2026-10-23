import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OPAI", template: "%s · OPAI" },
  description: "Plataforma operacional para empresas intensivas en personal.",
  applicationName: "OPAI",
};

// viewport-fit=cover: habilita env(safe-area-inset-*) en iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Tema elegido en Preferencias (guardado en este dispositivo): se aplica antes de pintar.
const TEMA = `try{var t=localStorage.getItem("opai_tema");if(t==="oscuro"||t==="claro")document.documentElement.dataset.theme=t==="oscuro"?"dark":"light"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CL" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
