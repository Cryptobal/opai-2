"use client";

import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { Cerrar, claseScrim } from "./dialog-partes";

export type DialogProps = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  /** Botones al pie: en teléfono apilados a ancho completo, en md+ a la derecha. */
  acciones?: ReactNode;
  /** `md` (440 px, confirmaciones) o `grande` (vista previa: pantalla completa en teléfono). */
  tamano?: "md" | "grande";
  /** Barra superior propia (vista previa): reemplaza título y descripción visibles. */
  barra?: ReactNode;
  className?: string;
};

/**
 * Diálogo modal sobre Radix (ADR-017): foco atrapado, Escape y clic fuera cierran, título accesible.
 * Para confirmaciones, un dato que se muestra una sola vez y la vista previa de documentos.
 */
export function DialogRadix(props: DialogProps) {
  const {
    abierto,
    onCerrar,
    titulo,
    descripcion,
    children,
    acciones,
    tamano = "md",
    barra,
  } = props;
  const grande = tamano === "grande";
  return (
    <RadixDialog.Root open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={claseScrim} />
        <RadixDialog.Content
          {...(descripcion ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed z-50 flex flex-col bg-surface-raised text-fg shadow-overlay outline-none",
            "data-[state=open]:animate-[ds-entrar_200ms_var(--ds-ease)] motion-reduce:animate-none",
            grande
              ? "inset-0 md:inset-8 md:m-auto md:max-h-[860px] md:max-w-[1040px] md:rounded-lg"
              : "top-1/2 left-1/2 max-h-[90dvh] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-lg",
            props.className,
          )}
        >
          {barra ? (
            <>
              <RadixDialog.Title className="sr-only">{titulo}</RadixDialog.Title>
              {barra}
            </>
          ) : (
            <div className="flex items-start gap-3 px-5 pt-5">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <RadixDialog.Title className="t-subheading text-fg">{titulo}</RadixDialog.Title>
                {descripcion ? (
                  <RadixDialog.Description className="text-base text-fg-muted">
                    {descripcion}
                  </RadixDialog.Description>
                ) : null}
              </div>
              {grande ? <Cerrar /> : null}
            </div>
          )}
          {children ? (
            <div className={cn(grande ? "min-h-0 flex-1 overflow-auto" : "px-5 pt-3")}>
              {children}
            </div>
          ) : null}
          {acciones ? (
            <footer className="flex flex-col-reverse gap-2 px-5 pt-5 pb-5 md:flex-row md:justify-end [&>*]:h-12 md:[&>*]:h-10">
              {acciones}
            </footer>
          ) : grande ? null : (
            <div className="h-5" />
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
