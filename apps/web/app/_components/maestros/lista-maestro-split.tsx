import type { ReactNode } from "react";

import {
  Cabecera,
  Estado,
  type EstadoPantalla,
  FilaSeleccionable,
  MetaLista,
} from "@opai/ds";

import { LinkNext } from "../link-next";

import type { FilaLista } from "./lista-maestro";

type Props = {
  state: EstadoPantalla;
  titulo: string;
  accion?: ReactNode;
  meta?: { izquierda: ReactNode; derecha?: ReactNode };
  filas: readonly FilaLista[];
  seleccionada?: string | undefined;
  vacio: { titulo: string; descripcion?: string; accion?: ReactNode };
  pie?: ReactNode;
};

/** Columna de lista en split-screen (sin buscador ni chips; ADR-037). */
export function ListaMaestroSplit(p: Props) {
  const estado = p.state === "ready" && p.filas.length === 0 ? "empty" : p.state;
  return (
    <>
      {p.accion ? (
        <div className="md:px-4 md:pt-3">
          <Cabecera titulo={p.titulo} acciones={p.accion} accionesSiempre />
        </div>
      ) : (
        <div className="md:hidden">
          <Cabecera titulo={p.titulo} />
        </div>
      )}
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
