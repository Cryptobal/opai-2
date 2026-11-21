import { Badge, cn, FilaSeleccionable } from "@opai/ds";

import { LinkIndice } from "@/app/_components/link-indice";

import type { FilaLista } from "./filtro-lista";
import type { Seccion } from "./secciones";

/** Fila del índice de Configuración (teléfono + escritorio) para `ListaGrupo` y `ListaModulos`. */
export function filaListaConfig(
  s: Seccion,
  activa: boolean,
  aprobaciones: number,
  texto?: string,
): FilaLista {
  const n = s.id === "aprobaciones" ? aprobaciones : 0;
  return {
    id: s.id,
    texto: texto ?? `${s.titulo} ${s.descripcion}`,
    nodo: (
      <>
        <FilaSeleccionable
          className="border-0 md:hidden"
          Link={LinkIndice}
          href={s.href}
          titulo={s.titulo}
          secundario={s.descripcion}
          seleccionada={activa}
          inicio={<s.icono aria-hidden className="size-[18px] flex-none text-fg-muted" />}
          fin={n ? <Badge tono="warning">{n}</Badge> : null}
        />
        <LinkIndice
          href={s.href}
          aria-current={activa ? "page" : undefined}
          className={cn(
            "relative hidden min-h-11 items-center gap-3 px-4 py-2 text-fg outline-none transition-colors duration-150 hover:bg-fill dark:hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:flex",
            activa &&
              "bg-accent-muted hover:bg-accent-muted before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-accent before:content-['']",
          )}
        >
          <s.icono aria-hidden className="size-[18px] flex-none text-fg-muted" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate text-base", activa ? "font-semibold" : "font-medium")}>
              {s.titulo}
            </span>
            <span className="t-caption truncate">{s.descripcion}</span>
          </span>
          {n ? <Badge tono="warning">{n}</Badge> : null}
        </LinkIndice>
      </>
    ),
  };
}