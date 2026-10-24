"use client";

import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { Cerrar, claseScrim } from "./dialog-partes";

export type SheetProps = {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  /** Acciones al pie (Cancelar · Guardar). */
  acciones?: ReactNode;
  /** `completo`: pantalla completa en teléfono (formularios de creación) en vez de hoja inferior. */
  telefono?: "hoja" | "completo";
  /** Hoja abierta desde otra hoja o diálogo: su fondo y su panel van por encima de los de abajo. */
  superior?: boolean;
};

/**
 * Panel modal sobre Radix (ADR-017): inferior con asa en teléfono (o pantalla completa), lateral de
 * 420 px en md+. Cabecera con título y cerrar; pie con acciones. Única superficie con sombra.
 */
export function SheetRadix(props: SheetProps) {
  const {
    abierto,
    onCerrar,
    titulo,
    descripcion,
    children,
    acciones,
    telefono = "hoja",
    superior = false,
  } = props;
  const completo = telefono === "completo";
  return (
    <RadixDialog.Root open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={cn(claseScrim, superior && "z-[60]")} />
        <RadixDialog.Content
          {...(descripcion ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed inset-x-0 bottom-0 flex flex-col bg-surface-raised text-fg shadow-overlay outline-none",
            superior ? "z-[70]" : "z-50",
            "data-[state=open]:animate-[ds-subir_200ms_var(--ds-ease)] md:data-[state=open]:animate-[ds-lateral_200ms_var(--ds-ease)] motion-reduce:animate-none",
            completo ? "top-0 max-md:pt-[env(safe-area-inset-top)]" : "max-h-[90dvh] rounded-t-xl",
            "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-lg",
          )}
        >
          {completo ? null : (
            <div
              aria-hidden
              className="mx-auto mt-2 h-[5px] w-9 flex-none rounded-full bg-border-strong md:hidden"
            />
          )}
          <header className="flex items-center justify-between gap-3 border-b border-border py-2 pr-2 pl-4">
            <div className="min-w-0">
              <RadixDialog.Title className="t-subheading truncate text-fg">
                {titulo}
              </RadixDialog.Title>
              {descripcion ? (
                <RadixDialog.Description className="t-caption">
                  {descripcion}
                </RadixDialog.Description>
              ) : null}
            </div>
            <Cerrar />
          </header>
          <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
            {children}
          </div>
          {acciones ? (
            <footer className="flex gap-2 border-t border-border px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] [&>*]:h-12 [&>*]:flex-1 md:justify-end md:[&>*]:h-10 md:[&>*]:flex-none">
              {acciones}
            </footer>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
