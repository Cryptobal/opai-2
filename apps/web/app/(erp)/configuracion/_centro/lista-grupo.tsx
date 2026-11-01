import { Badge, cn } from "@opai/ds";

import { LinkIndice } from "@/app/_components/link-indice";

import { FiltroLista } from "./filtro-lista";
import type { Seccion } from "./secciones";

/** Más de 7 entradas solo las tiene el grupo Módulos (REGLA §1.3); ahí aparece el buscador propio. */
const MAX_SIN_BUSCADOR = 7;

type Props = {
  /** Etiqueta del grupo (para el nombre accesible de la lista). */
  etiqueta: string;
  entradas: readonly Seccion[];
  aprobaciones: number;
  /** Id de la entrada activa (se resalta con `aria-current`). */
  seleccionada?: string;
};

/**
 * Lista de las entradas visibles de un grupo (columna izquierda del `SplitScreen` en iPad/escritorio
 * y pantalla única en teléfono). Solo pinta las entradas del grupo, nunca el índice completo (REGLA
 * §1, brief §4.2). El grupo Módulos puede pasar de 7 entradas y entonces trae su propio buscador.
 */
export function ListaGrupo({ etiqueta, entradas, aprobaciones, seleccionada }: Props) {
  const filas = entradas.map((s) => {
    const activa = s.id === seleccionada;
    const n = s.id === "aprobaciones" ? aprobaciones : 0;
    return {
      id: s.id,
      texto: `${s.titulo} ${s.descripcion}`,
      nodo: (
        <LinkIndice
          href={s.href}
          aria-current={activa ? "page" : undefined}
          className={cn(
            "relative flex min-h-11 items-center gap-3 px-4 py-2 text-fg outline-none transition-colors duration-150 hover:bg-fill dark:hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
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
        </LinkIndice>
      ),
    };
  });
  const conBuscador = entradas.length > MAX_SIN_BUSCADOR;
  return (
    <nav aria-label={`Entradas de ${etiqueta}`} className="flex flex-col pb-4">
      {conBuscador ? (
        <FiltroLista filas={filas} placeholder="Buscar un módulo" />
      ) : (
        <ul className="max-md:-mx-4 max-md:bg-surface">
          {filas.map((f) => (
            <li key={f.id} className="max-md:border-b max-md:border-border">
              {f.nodo}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
