"use client";

import { Popover as RadixPopover } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { claseOverlay } from "./menu";

export type PopoverProps = {
  /** Elemento disparador (un `Button` del DS); se usa con `asChild`. */
  disparador: ReactNode;
  children: ReactNode;
  abierto?: boolean;
  onCambiar?: (abierto: boolean) => void;
  lado?: "top" | "bottom" | "left" | "right";
  alinear?: "start" | "center" | "end";
  /** Nombre accesible del panel. */
  etiqueta?: string;
  className?: string;
  abiertoInicial?: boolean;
};

/** Panel anclado sobre Radix (campana, filtros avanzados): radio 10; Escape y clic fuera cierran. */
export function PopoverRadix(props: PopoverProps) {
  const { disparador, children, abierto, onCambiar, lado = "bottom", alinear = "end" } = props;
  return (
    <RadixPopover.Root
      defaultOpen={props.abiertoInicial ?? false}
      {...(abierto !== undefined ? { open: abierto } : {})}
      {...(onCambiar ? { onOpenChange: onCambiar } : {})}
    >
      <RadixPopover.Trigger asChild>{disparador}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={lado}
          align={alinear}
          sideOffset={6}
          collisionPadding={8}
          aria-label={props.etiqueta}
          className={cn(claseOverlay, "w-80 max-w-[calc(100vw-16px)]", props.className)}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
