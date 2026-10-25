"use client";

import { Check } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { claseDisparadorMenu, claseOverlay, type ItemMenu, LADO } from "./menu";

export type MenuProps = {
  /** Contenido del botón disparador (avatar, icono…). */
  disparador: ReactNode;
  etiqueta: string;
  /** Nombre completo en el tooltip nativo cuando el disparador lo abrevia. */
  titulo?: string;
  items: readonly ItemMenu[];
  /** Cabecera informativa (nombre y correo del usuario). */
  cabecera?: ReactNode;
  /** Dónde se abre respecto del disparador. */
  lado?: keyof typeof LADO;
  className?: string;
  claseDisparador?: string;
  /** Abierto al montar (la versión diferida lo monta con el primer clic). */
  abiertoInicial?: boolean;
};

/** Menú desplegable sobre Radix (ADR-017): teclado, Escape y clic fuera; ítems de 44 px. */
export function MenuRadix(props: MenuProps) {
  const { disparador, etiqueta, items, cabecera, lado = "abajo-derecha" } = props;
  return (
    <DropdownMenu.Root modal={false} defaultOpen={props.abiertoInicial ?? false}>
      <div className={cn("relative", props.className)}>
        <DropdownMenu.Trigger
          aria-label={etiqueta}
          {...(props.titulo ? { title: props.titulo } : {})}
          className={cn(claseDisparadorMenu, props.claseDisparador)}
        >
          {disparador}
        </DropdownMenu.Trigger>
      </div>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          {...LADO[lado]}
          sideOffset={4}
          aria-label={etiqueta}
          className={cn(
            claseOverlay,
            "max-h-(--radix-dropdown-menu-content-available-height) w-64 overflow-y-auto py-1",
          )}
        >
          {cabecera ? <div className="border-b border-border px-3 py-2.5">{cabecera}</div> : null}
          {items.map((item, i) => (
            <div key={item.id}>
              {item.grupo ? (
                <>
                  {i > 0 ? <DropdownMenu.Separator className="my-1 h-px bg-border" /> : null}
                  <DropdownMenu.Label className="t-overline px-3 pt-2 pb-1">
                    {item.grupo}
                  </DropdownMenu.Label>
                </>
              ) : null}
              <DropdownMenu.Item
                disabled={item.deshabilitado}
                onSelect={item.onSelect}
                className={cn(
                  "flex h-11 cursor-default items-center gap-2.5 px-3 text-base outline-none select-none data-[disabled]:opacity-45 data-[highlighted]:bg-fill",
                  item.peligro ? "text-danger-fg" : "text-fg",
                )}
              >
                {item.icono ? <item.icono className="size-4 text-fg-muted" aria-hidden /> : null}
                <span className="min-w-0 flex-1 truncate">{item.etiqueta}</span>
                {item.marcado ? <Check className="size-4 text-accent" aria-label="actual" /> : null}
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
