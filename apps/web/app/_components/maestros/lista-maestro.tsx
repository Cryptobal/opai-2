import type { ReactNode } from "react";

import {
  Cabecera,
  Estado,
  type EstadoPantalla,
  FilaSeleccionable,
  HerramientasLista,
  MetaLista,
} from "@opai/ds";

import { LinkNext } from "../link-next";
import { Buscador } from "./buscador";
import type { Filtro } from "./chips-filtro";
import { ChipsFiltroDiferido } from "./chips-filtro-diferido";

export type FilaLista = {
  id: string;
  href: string;
  titulo: ReactNode;
  secundario?: ReactNode;
  terciario?: ReactNode;
  inicio?: ReactNode;
  fin?: ReactNode;
  /** Ajuste de la fila (por ejemplo, menos relleno vertical cuando el contenido de la derecha es más alto). */
  className?: string;
};

type Props = {
  state: EstadoPantalla;
  /** Título de la lista en teléfono (en md+ va en la barra superior). */
  titulo: string;
  accion?: ReactNode;
  /** Fila sobre la búsqueda (por ejemplo, el cambio Tablero/Lista de Negocios). */
  vista?: ReactNode;
  buscar: string;
  filtros?: readonly Filtro[];
  meta?: { izquierda: ReactNode; derecha?: ReactNode };
  filas: readonly FilaLista[];
  seleccionada?: string | undefined;
  vacio: { titulo: string; descripcion?: string; accion?: ReactNode };
  pie?: ReactNode;
};

/** Columna de lista de un maestro (búsqueda, chips, metadatos y filas seleccionables). */
export function ListaMaestro(p: Props) {
  const estado = p.state === "ready" && p.filas.length === 0 ? "empty" : p.state;
  return (
    <>
      {/* En teléfono, título + acción; en md+ el título vive en la barra superior, pero la acción
          principal se queda en el patrón (Brief 05 §8.3, REGLAS-codigo UI), arriba de la lista. */}
      {p.accion ? (
        <div className="md:px-4 md:pt-3">
          <Cabecera titulo={p.titulo} acciones={p.accion} accionesSiempre />
        </div>
      ) : (
        <div className="md:hidden">
          <Cabecera titulo={p.titulo} />
        </div>
      )}
      {p.vista ? <div className="pb-2.5 md:px-4 md:pt-3 md:pb-0">{p.vista}</div> : null}
      <HerramientasLista>
        <Buscador placeholder={p.buscar} />
        {p.filtros?.length ? <ChipsFiltroDiferido filtros={p.filtros} /> : null}
      </HerramientasLista>
      {p.meta ? <MetaLista izquierda={p.meta.izquierda} derecha={p.meta.derecha} /> : null}
      <div className="-mx-4 border-t border-border md:mx-0 md:border-t-0">
        <Estado state={estado} variante="lista" textos={{ vacio: p.vacio }}>
          <div className="flex flex-col bg-surface">
            {p.filas.map((f) => (
              <FilaSeleccionable
                key={f.id}
                href={f.href}
                Link={LinkNext}
                titulo={f.titulo}
                secundario={f.secundario}
                terciario={f.terciario}
                inicio={f.inicio}
                fin={f.fin}
                {...(f.className ? { className: f.className } : {})}
                seleccionada={p.seleccionada === f.id}
              />
            ))}
          </div>
          {p.pie}
        </Estado>
      </div>
    </>
  );
}
