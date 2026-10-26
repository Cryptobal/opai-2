import { Badge, cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import type { Indice } from "./datos";
import { FiltroIndice } from "./filtro-indice";

type Props = {
  indice: Indice;
  seleccionada?: string;
  q?: string | undefined;
};

/**
 * Índice del centro de Configuración (19/20): "Buscar un ajuste", grupos, icono, título y
 * descripción; aprobaciones con contador. Igual en `/configuracion` y en cada sección.
 */
export function IndiceConfig({ indice, seleccionada, q }: Props) {
  const filas = indice.secciones.map((s) => {
    const activa = s.id === seleccionada;
    const n = s.id === "aprobaciones" ? indice.aprobaciones : 0;
    return {
      id: s.id,
      grupo: s.grupo,
      texto: `${s.titulo} ${s.descripcion}`,
      nodo: (
        <LinkNext
          href={s.href}
          aria-current={activa ? "page" : undefined}
          className={cn(
            "relative flex min-h-11 items-center gap-3 px-4 py-2 text-fg outline-none transition-colors duration-150 hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
            activa &&
              "bg-accent-muted hover:bg-accent-muted before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-accent before:content-['']",
          )}
        >
          <s.icono aria-hidden className="size-[18px] flex-none text-fg-muted" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate text-base", activa ? "font-semibold" : "font-medium")}>
              {s.titulo}
            </span>
            <span className="t-caption truncate">
              <span className="md:hidden">{s.corta}</span>
              <span className="max-md:hidden">{s.descripcion}</span>
            </span>
          </span>
          {n ? <Badge tono="warning">{n}</Badge> : null}
        </LinkNext>
      ),
    };
  });
  return <FiltroIndice filas={filas} inicial={q} {...(seleccionada ? {} : { atajo: "/" })} />;
}
