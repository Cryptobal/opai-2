"use client";

import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";

export const claseScrim =
  "fixed inset-0 z-40 bg-scrim data-[state=open]:animate-[ds-aparecer_200ms_var(--ds-ease)] motion-reduce:animate-none";

/** Botón de cerrar para barras propias dentro de un `Dialog` o `Sheet`. */
export function Cerrar({ etiqueta = "Cerrar" }: { etiqueta?: string }) {
  return (
    <RadixDialog.Close
      aria-label={etiqueta}
      className="flex size-11 flex-none items-center justify-center rounded-md text-fg outline-none hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus"
    >
      <X className="size-5" />
    </RadixDialog.Close>
  );
}
