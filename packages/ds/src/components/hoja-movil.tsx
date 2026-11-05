"use client";

import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { claseScrim } from "./dialog-partes";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  /** Nombre accesible del diálogo (no se ve: la cabecera la arma cada pantalla). */
  titulo: string;
  onRestaurarFoco?: () => void;
  /** Escape: llámalo con `preventDefault` para atenderlo sin cerrar la hoja. */
  onEscape?: (e: KeyboardEvent) => void;
  /** Al abrir, el foco va al primer campo (búsqueda). Sin esto, queda en la hoja y no sube el teclado. */
  enfocarCampo?: boolean;
  children: ReactNode;
};

/**
 * Hoja inferior del teléfono (CAR-182): asa, esquinas `rounded-xl`, 90 % del alto como máximo y alto
 * estable (no salta al cambiar de contenido). El fondo se difumina además de oscurecerse, así el
 * título de la página no se lee detrás de la barra superior. Una sola capa modal, foco atrapado.
 */
export function HojaMovil({ abierto, onCerrar, titulo, onRestaurarFoco, onEscape, enfocarCampo, children }: Props) {
  return (
    <RadixDialog.Root open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={cn(claseScrim, "backdrop-blur-md")} />
        <RadixDialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={enfocarCampo ? undefined : (e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus();
          }}
          onCloseAutoFocus={onRestaurarFoco ? (e) => { e.preventDefault(); onRestaurarFoco(); } : undefined}
          onEscapeKeyDown={onEscape}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[min(90dvh,720px)] flex-col rounded-t-xl bg-surface-raised text-fg shadow-overlay outline-none data-[state=open]:animate-[ds-subir_200ms_var(--ds-ease)] motion-reduce:animate-none"
        >
          <RadixDialog.Title className="sr-only">{titulo}</RadixDialog.Title>
          <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 flex-none rounded-full bg-border-strong" />
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
