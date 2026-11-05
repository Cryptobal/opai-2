"use client";

import { Command } from "cmdk";
import { type LucideIcon, Search } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { useState } from "react";

import { iniciales } from "./avatar";
import { Resaltado } from "./resaltado";
import { PieTeclas } from "./command-palette-pie";
import { claseScrim } from "./dialog-partes";
import { HojaBusqueda } from "./hoja-busqueda";
import { Kbd } from "./segmentado";
import { useBusqueda, useEsTelefono } from "./use-busqueda";

export type ItemPaleta = {
  id: string;
  etiqueta: string;
  detalle?: string;
  icono?: LucideIcon;
  /** Persona: avatar de iniciales en vez de icono. */
  persona?: boolean;
  href: string;
};
export type GrupoPaleta = { titulo: string; items: readonly ItemPaleta[] };

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  /** Resultados para el texto (búsqueda global, `core.buscar`); se llama con 200 ms de pausa. */
  buscar: (q: string) => Promise<readonly GrupoPaleta[]>;
  /** Grupos sin texto (Ir a). */
  iniciales?: readonly GrupoPaleta[];
  onElegir: (item: ItemPaleta) => void;
};

/**
 * Búsqueda global y "buscar un ajuste" (⌘K): diálogo de 640 px en iPad y desktop, con grupos Ir a,
 * Cuentas, Instalaciones, Personas y Ajustes y navegación con teclado. En teléfono es la hoja inferior
 * compartida con el menú «Más» (un solo flujo de búsqueda, CAR-182).
 */
export function CommandPalette(props: Props) {
  const telefono = useEsTelefono();
  return telefono ? <HojaBusqueda {...props} /> : <PaletaEscritorio {...props} />;
}

function PaletaEscritorio({ abierto, onCerrar, buscar, onElegir, ...p }: Props) {
  const [q, setQ] = useState("");
  const b = useBusqueda(q, abierto, buscar, p.iniciales ?? []);
  const { grupos, cargando } = b;
  return (
    <RadixDialog.Root open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={claseScrim} />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-surface-raised text-fg shadow-overlay outline-none md:inset-x-0 md:top-24 md:bottom-auto md:mx-auto md:max-h-[min(560px,calc(100dvh-120px))] md:w-[640px] md:rounded-lg md:border md:border-border"
        >
          <RadixDialog.Title className="sr-only">Buscar o ir a…</RadixDialog.Title>
          <Command
            shouldFilter={false}
            label="Buscar o ir a"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex h-14 flex-none items-center gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top)] md:pt-0">
              <Search className="size-5 text-fg-muted" aria-hidden />
              <Command.Input
                value={q}
                onValueChange={setQ}
                placeholder="Buscar cuentas, instalaciones, personas o ajustes"
                className="h-full min-w-0 flex-1 bg-transparent text-md text-fg outline-none placeholder:text-fg-subtle"
              />
              <RadixDialog.Close className="rounded-sm text-sm text-fg-muted outline-none focus-visible:outline-2 focus-visible:outline-focus">
                <Kbd className="hidden md:inline-flex">Esc</Kbd>
                <span className="md:hidden">Cancelar</span>
              </RadixDialog.Close>
            </div>
            <Command.List className="min-h-0 flex-1 overflow-y-auto p-2">
              {cargando ? (
                <Command.Loading className="px-3 py-3 text-base text-fg-muted">
                  Buscando…
                </Command.Loading>
              ) : null}
              {!cargando && b.buscando ? (
                <Command.Empty className="px-3 py-6 text-center text-base text-fg-muted">
                  Sin resultados para “{q}”
                </Command.Empty>
              ) : null}
              {grupos.map((g) => (
                <Command.Group
                  key={g.titulo}
                  heading={g.titulo}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle"
                >
                  {g.items.map((it) => (
                    <Command.Item
                      key={it.id}
                      value={`${g.titulo}-${it.id}`}
                      onSelect={() => onElegir(it)}
                      className="group flex min-h-11 cursor-default items-center gap-3 rounded-md px-3 text-base text-fg data-[selected=true]:bg-fill"
                    >
                      {it.persona ? (
                        <span
                          aria-hidden
                          className="flex size-6 flex-none items-center justify-center rounded-full bg-fill text-[10px] font-semibold text-fg-muted group-data-[selected=true]:bg-surface"
                        >
                          {iniciales(it.etiqueta)}
                        </span>
                      ) : it.icono ? (
                        <it.icono className="size-4 flex-none text-fg-muted" aria-hidden />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">
                        <Resaltado texto={it.etiqueta} q={q.trim()} />
                      </span>
                      {it.detalle ? (
                        <span className="hidden truncate text-sm text-fg-muted sm:block">
                          {it.detalle}
                        </span>
                      ) : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
            <PieTeclas />
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
