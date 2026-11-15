import type { ReactNode } from "react";

import { Estado, type EstadoPantalla, FilaSeleccionable, MetaLista } from "@opai/ds";

import { LinkNext } from "../link-next";

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
  filas: readonly FilaLista[];
  seleccionada?: string | undefined;
  vacio: { titulo: string; descripcion?: string; accion?: ReactNode };
  meta?: { izquierda: ReactNode; derecha?: ReactNode };
  pie?: ReactNode;
};

/** Meta, estado vacío y filas seleccionables compartidos por lista y lista split. */
export function CuerpoListaMaestro(p: Props) {
  const estado = p.state === "ready" && p.filas.length === 0 ? "empty" : p.state;
  return (
    <>
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
