"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast, Toaster as Sonner } from "sonner";

/**
 * Contenedor de avisos (una vez, en el layout raíz). Inferior en teléfono sobre la barra de
 * navegación, inferior derecha en desktop; inverso; 4 s.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={4000}
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{ bottom: "calc(72px + env(safe-area-inset-bottom))", left: 16, right: 16 }}
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

type Accion = { etiqueta: string; onClick: () => void };

const conAccion = (accion?: Accion) =>
  accion ? { action: { label: accion.etiqueta, onClick: accion.onClick } } : {};

/** Avisos de acciones: éxito, error (con "Reintentar") o información. */
export const avisar = {
  exito: (texto: string, accion?: Accion) => toast.success(texto, conAccion(accion)),
  error: (texto: string, accion?: Accion) => toast.error(texto, conAccion(accion)),
  info: (texto: string, accion?: Accion) => toast.info(texto, conAccion(accion)),
};
