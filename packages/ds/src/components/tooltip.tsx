"use client";

import { Popover as RadixPopover, Tooltip as RadixTooltip } from "radix-ui";
import type { ReactNode } from "react";

/** Cierra el `Popover` que lo contiene (para botones "Aplicar" o enlaces internos). */
export const CerrarPopover = RadixPopover.Close;

type TooltipProps = { texto: string; children: ReactNode; lado?: "top" | "bottom" };

/**
 * Ayuda breve sobre un icono o control (solo con puntero; 150 ms; inverso). Nunca lleva información
 * imprescindible: el control debe tener su propio nombre accesible.
 */
export function Tooltip({ texto, children, lado = "top" }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={150}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={lado}
            sideOffset={6}
            className="z-50 rounded-sm bg-inverse-bg px-2 py-1 text-sm font-medium text-inverse-fg data-[state=delayed-open]:animate-[ds-aparecer_150ms_var(--ds-ease)] motion-reduce:animate-none"
          >
            {texto}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
