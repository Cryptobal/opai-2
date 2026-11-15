import type { ReactNode } from "react";

import { Cabecera, type EstadoPantalla } from "@opai/ds";

import { CuerpoListaMaestro, type FilaLista } from "./cuerpo-lista-maestro";

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
