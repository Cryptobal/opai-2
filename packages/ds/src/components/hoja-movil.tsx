"use client";

import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { claseScrim } from "./dialog-partes";
import { ATRIBUTO_DISPARADOR, useHojaSobreBarra } from "./hoja-sobre-barra";

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
export function HojaMovil({
  abierto,
  onCerrar,
  titulo,
  onRestaurarFoco,
  onEscape,
  enfocarCampo,
  children,
}: Props) {
  const sobreBarra = useHojaSobreBarra();
  return (
    <RadixDialog.Root open={abierto} onOpenChange={(a) => !a && onCerrar()} modal={!sobreBarra}>
      <RadixDialog.Portal>
        {sobreBarra ? null : <RadixDialog.Overlay className={cn(claseScrim, "backdrop-blur-md")} />}
        <RadixDialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={
            enfocarCampo
              ? undefined
              : (e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement | null)?.focus();
                }
          }
          onCloseAutoFocus={
            onRestaurarFoco
              ? (e) => {
                  e.preventDefault();
                  onRestaurarFoco();
                }
              : undefined
          }
          onEscapeKeyDown={onEscape}
          // Sobre la barra, tocar la pestaña «Menú» la cierra con su propio clic (no cerrar y reabrir).
          onPointerDownOutside={(e) => {
            const t = e.target instanceof Element ? e.target : null;
            if (sobreBarra && t?.closest(`[${ATRIBUTO_DISPARADOR}]`)) e.preventDefault();
          }}
          data-sobre-barra={sobreBarra ? "" : undefined}
          className={cn(
            "fixed inset-x-0 flex flex-col bg-surface-raised text-fg outline-none",
            sobreBarra
              ? "top-0 bottom-[var(--ds-alto-barra-inferior)] z-30 pt-safe"
              : "bottom-0 z-50 h-[min(90dvh,720px)] rounded-t-xl shadow-overlay data-[state=open]:animate-[ds-subir_200ms_var(--ds-ease)] motion-reduce:animate-none",
          )}
        >
          <RadixDialog.Title className="sr-only">{titulo}</RadixDialog.Title>
          {sobreBarra ? null : (
            <div
              aria-hidden
              className="mx-auto mt-2 h-[5px] w-9 flex-none rounded-full bg-border-strong"
            />
          )}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
