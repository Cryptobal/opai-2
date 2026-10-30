"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Toaster as Sonner } from "sonner";

/**
 * Contenedor de avisos (una vez, en el layout raíz). Inferior en teléfono por encima de la barra de
 * navegación, inferior derecha en desktop; inverso (fondo opaco `bg-inverse-bg`); 4 s.
 *
 * En teléfono el desplazamiento inferior se alinea con la zona que el shell reserva para la barra
 * (`AppShell` deja `pb-[calc(96px+safe-area)]`): la barra mide ~56 px + safe-area, así que a 96 px el
 * aviso queda claramente sobre ella incluso durante la animación de entrada. Antes iba a 72 px y el
 * aviso rozaba la barra y su texto se mezclaba con «Cuentas»/«Personas» (H6 del QA en vivo del #136).
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={4000}
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{ bottom: "calc(96px + env(safe-area-inset-bottom))", left: 16, right: 16 }}
      icons={{
        success: <CheckCircle2 className="size-4" aria-hidden />,
        error: <AlertTriangle className="size-4" aria-hidden />,
        info: <Info className="size-4" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-md bg-inverse-bg px-4 py-3 text-base text-inverse-fg shadow-overlay md:w-[356px]",
          title: "min-w-0 flex-1 font-medium",
          description: "text-sm opacity-80",
          actionButton:
            "ml-auto h-9 shrink-0 rounded-sm px-2 font-semibold text-inverse-fg hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)]",
          icon: "flex-none",
        },
      }}
    />
  );
}
