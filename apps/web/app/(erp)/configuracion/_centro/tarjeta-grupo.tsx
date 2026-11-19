import { ChevronRight } from "lucide-react";

import { cn } from "@opai/ds";

import { LinkIndice } from "@/app/_components/link-indice";

import type { GrupoConEntradas } from "./datos";

/**
 * Tarjeta de grupo de la portada (brief §4.1, MC-22): un solo enlace a la lista del grupo en todos
 * los tamaños (evita dos destinos iguales en el DOM entre la fila de teléfono y la tarjeta de
 * escritorio).
 */
export function TarjetaGrupo({ grupo, entradas }: GrupoConEntradas) {
  if (entradas.length === 0) return null;
  const Icono = grupo.icono;
  const previas = entradas
    .slice(0, 3)
    .map((e) => e.titulo)
    .join(" · ");
  const destino = `/configuracion/grupo/${grupo.id}`;
  return (
    <LinkIndice
      href={destino}
      aria-label={`${grupo.etiqueta}: ${grupo.corta}`}
      className={cn(
        "text-fg outline-none transition-colors duration-150 hover:border-fg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
        "flex min-h-16 w-full items-center gap-3 border-b border-border py-2.5 pr-3 pl-4 md:min-h-[132px] md:flex-col md:items-stretch md:rounded-lg md:border md:bg-surface md:p-4 max-md:last:border-b-0",
      )}
    >
      <span className="flex size-9 flex-none items-center justify-center rounded-md bg-fill text-fg-muted md:mb-2 md:size-10">
        <Icono aria-hidden className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col md:flex-none">
        <span className="t-subheading truncate text-fg max-md:text-base max-md:font-medium">{grupo.etiqueta}</span>
        <span className="t-caption truncate text-fg-muted md:mt-0.5 md:text-sm">{grupo.corta}</span>
        {previas ? <span className="mt-2 hidden t-caption truncate md:inline">{previas}</span> : null}
      </span>
      <ChevronRight aria-hidden className="size-5 flex-none text-fg-subtle md:hidden" />
    </LinkIndice>
  );
}