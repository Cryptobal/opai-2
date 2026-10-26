import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OPAI", template: "%s · OPAI" },
  description: "Plataforma operacional para empresas intensivas en personal.",
  applicationName: "OPAI",
  // Instalación en iOS (no expone beforeinstallprompt): modo standalone y título de la app.
  appleWebApp: { capable: true, title: "OPAI", statusBarStyle: "default" },
  // apple-touch-icon (iOS) e ícono general; el manifest lleva el resto de los íconos (PWA).
  icons: { apple: "/apple-touch-icon.png" },
  // mobile-web-app-capable es el estándar actual; Next ya emite el apple-* desde appleWebApp.
  other: { "mobile-web-app-capable": "yes" },
};

// viewport-fit=cover: habilita env(safe-area-inset-*) en iOS. theme-color por tema para la barra de
// estado en standalone (ADR-044.1): claro y oscuro desde --ds-bg de packages/ds/src/tokens.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
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
