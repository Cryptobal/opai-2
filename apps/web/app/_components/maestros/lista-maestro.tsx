import type { ReactNode } from "react";

import { Cabecera, cn, type EstadoPantalla, HerramientasLista } from "@opai/ds";

import { AccionListaFlotante } from "./accion-lista-flotante";
import { Buscador } from "./buscador";
import type { Filtro } from "./chips-filtro";
import { ChipsFiltroDiferido } from "./chips-filtro-diferido";
import { CuerpoListaMaestro, type FilaLista } from "./cuerpo-lista-maestro";
import { VistasDiferidas } from "./vistas-diferidas";

type Props = {
  state: EstadoPantalla;
  /** Título de la lista en teléfono (en md+ va en la barra superior). */
  titulo: string;
  accion?: ReactNode;
  /** En teléfono la acción va flotante (D-B); en lg+ sigue en la cabecera de la lista. */
  accionFlotante?: boolean;
  /** Fila sobre la búsqueda (por ejemplo, el cambio Tablero/Lista de Negocios). */
  vista?: ReactNode;
  buscar: string;
  filtros?: readonly Filtro[];
  meta?: { izquierda: ReactNode; derecha?: ReactNode };
  filas: readonly FilaLista[];
  seleccionada?: string | undefined;
  vacio: { titulo: string; descripcion?: string; accion?: ReactNode };
  /** Vistas guardadas de esta lista (CAR-335 D4c): clave de la lista y su ruta. */
  vistas?: { lista: string; ruta: string };
  /** Filtros extra debajo de los chips (p. ej. rango de fechas en Cotizaciones). */
  debajoFiltros?: ReactNode;
  pie?: ReactNode;
};

/** Columna de lista de un maestro (búsqueda, chips, metadatos y filas seleccionables). */
export function ListaMaestro(p: Props) {
  return (
    <>
      {/* En teléfono, título + acción; en md+ el título vive en la barra superior, pero la acción
          principal se queda en el patrón (Brief 05 §8.3, REGLAS-codigo UI), arriba de la lista. */}
      {p.accion ? (
        <>
          <div className={cn("md:px-4 md:pt-3", p.accionFlotante && "hidden lg:block")}>
            <Cabecera titulo={p.titulo} acciones={p.accion} accionesSiempre />
          </div>
          {p.accionFlotante ? <AccionListaFlotante>{p.accion}</AccionListaFlotante> : null}
        </>
      ) : (
        <div className="md:hidden">
          <Cabecera titulo={p.titulo} />
        </div>
      )}
      {p.vista ? <div className="pb-2.5 md:px-4 md:pt-3 md:pb-0">{p.vista}</div> : null}
      <HerramientasLista>
        <Buscador placeholder={p.buscar} />
        {p.filtros?.length || p.vistas ? (
          <div className="flex flex-wrap items-center gap-2">
            {p.filtros?.length ? <ChipsFiltroDiferido filtros={p.filtros} /> : null}
            {p.vistas ? <VistasDiferidas lista={p.vistas.lista} ruta={p.vistas.ruta} /> : null}
          </div>
        ) : null}
        {p.debajoFiltros ? <div className="w-full pt-1">{p.debajoFiltros}</div> : null}
      </HerramientasLista>
      <CuerpoListaMaestro
        state={p.state}
        filas={p.filas}
        vacio={p.vacio}
        {...(p.meta ? { meta: p.meta } : {})}
        {...(p.seleccionada !== undefined ? { seleccionada: p.seleccionada } : {})}
        {...(p.pie !== undefined ? { pie: p.pie } : {})}
      />
    </>
  );
}
