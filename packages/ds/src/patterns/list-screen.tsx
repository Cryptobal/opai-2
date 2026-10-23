import type { ReactNode } from "react";

import { cn } from "../cn";
import { Table, Td, Th, Tr } from "../components/table";
import { Cabecera, Estado, type EstadoPantalla, type TextosEstado } from "./estado";

export type Columna<T> = {
  id: string;
  etiqueta: string;
  render: (item: T) => ReactNode;
  className?: string;
};

export type ListScreenProps<T> = {
  state: EstadoPantalla;
  titulo: string;
  subtitulo?: string;
  accionPrincipal?: ReactNode;
  /** Buscador y filtros son slots: el módulo decide el control, el patrón decide dónde va. */
  buscador?: ReactNode;
  filtros?: ReactNode;
  paginacion?: ReactNode;
  items: readonly T[];
  clave: (item: T) => string;
  /** Tarjeta por ítem en teléfono. */
  tarjeta: (item: T) => ReactNode;
  /** Columnas de la tabla en md+. */
  columnas: readonly Columna<T>[];
  onSeleccionar?: (item: T) => void;
  textos?: TextosEstado;
};

/** Lista: cabecera con acción principal, búsqueda, filtros, tarjetas en base y tabla en md+. */
export function ListScreen<T>(props: ListScreenProps<T>) {
  const {
    state,
    titulo,
    subtitulo,
    accionPrincipal,
    buscador,
    filtros,
    paginacion,
    items,
    clave,
    tarjeta,
    columnas,
    onSeleccionar,
    textos,
  } = props;
  const vacio = state === "ready" && items.length === 0 ? "empty" : state;
  return (
    <section>
      <Cabecera
        titulo={titulo}
        {...(subtitulo ? { subtitulo } : {})}
        {...(accionPrincipal ? { acciones: accionPrincipal } : {})}
      />
      {buscador || filtros ? (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          {buscador ? <div className="md:max-w-sm md:flex-1">{buscador}</div> : null}
          {filtros ? <div className="flex flex-wrap gap-2">{filtros}</div> : null}
        </div>
      ) : null}
      <Estado state={vacio} variante="lista" {...(textos ? { textos } : {})}>
        <ul className="flex flex-col gap-2 md:hidden">
          {items.map((item) => (
            <li key={clave(item)}>
              <button
                type="button"
                onClick={onSeleccionar ? () => onSeleccionar(item) : undefined}
                className={cn(
                  "w-full rounded-lg border border-border bg-surface p-4 text-left",
                  onSeleccionar && "active:bg-bg",
                )}
              >
                {tarjeta(item)}
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <Table>
            <thead>
              <tr>
                {columnas.map((c) => (
                  <Th key={c.id} className={c.className}>
                    {c.etiqueta}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Tr
                  key={clave(item)}
                  onClick={onSeleccionar ? () => onSeleccionar(item) : undefined}
                  className={cn(onSeleccionar && "cursor-pointer")}
                >
                  {columnas.map((c) => (
                    <Td key={c.id} className={c.className}>
                      {c.render(item)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
        {paginacion ? <div className="mt-4 flex justify-end">{paginacion}</div> : null}
      </Estado>
    </section>
  );
}
