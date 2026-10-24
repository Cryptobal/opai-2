import type { ReactNode } from "react";

import { cn } from "../cn";
import { Table, Td, Th, Tr } from "../components/table";
import { type LinkComponent, LinkPorDefecto } from "../shell/types";
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
  subtitulo?: ReactNode;
  /** La cabecera (título, subtítulo y acción) solo en teléfono ("57 personas"). */
  soloTelefono?: boolean;
  /** Sin cabecera propia: la página que lo contiene (p. ej. una sección de Configuración) ya la pone. */
  sinCabecera?: boolean;
  accionPrincipal?: ReactNode;
  /** Buscador y filtros son slots: el módulo decide el control, el patrón decide dónde va. */
  buscador?: ReactNode;
  filtros?: ReactNode;
  paginacion?: ReactNode;
  items: readonly T[];
  clave: (item: T) => string;
  /** Teléfono: encabezado de grupo pegajoso (inicial del apellido, "M"). */
  grupo?: (item: T) => string;
  /** Fila-tarjeta por ítem en teléfono (avatar, título, línea secundaria, badge). */
  tarjeta: (item: T) => ReactNode;
  /** Columnas de la tabla en md+. */
  columnas: readonly Columna<T>[];
  /** Fila como enlace (server-first, ADR-037): la fila entera navega sin JavaScript propio. */
  href?: (item: T) => string;
  /** Componente de enlace (next/link) cuando se usa `href`. Por defecto, <a>. */
  Link?: LinkComponent;
  /** Alternativa de cliente: fila como botón. */
  onSeleccionar?: (item: T) => void;
  textos?: TextosEstado;
};

/** Lista: cabecera con acción principal, búsqueda, chips de filtro, filas en base y tabla en md+. */
export function ListScreen<T>(props: ListScreenProps<T>) {
  const { state, titulo, subtitulo, accionPrincipal, buscador, filtros, paginacion, items } = props;
  const { clave, tarjeta, columnas, href, onSeleccionar, textos, grupo } = props;
  const Link = props.Link ?? LinkPorDefecto;
  const vacio = state === "ready" && items.length === 0 ? "empty" : state;
  const filaBase = "flex w-full items-start gap-3 px-4 py-3.5 text-left";
  return (
    <section>
      {props.sinCabecera ? null : (
        <Cabecera
          titulo={titulo}
          {...(subtitulo ? { subtitulo } : {})}
          {...(props.soloTelefono ? { soloTelefono: true } : {})}
          {...(accionPrincipal ? { acciones: accionPrincipal } : {})}
        />
      )}
      {buscador || filtros ? (
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center">
          {buscador ? <div className="md:w-72">{buscador}</div> : null}
          {filtros ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {filtros}
            </div>
          ) : null}
        </div>
      ) : null}
      <Estado state={vacio} variante="lista" {...(textos ? { textos } : {})}>
        <ul className="-mx-4 border-y border-border bg-surface md:hidden">
          {items.map((item, i) => (
            <li key={clave(item)} className="border-b border-border last:border-b-0">
              {grupo &&
              grupo(item) !== (i > 0 && items[i - 1] ? grupo(items[i - 1] as T) : null) ? (
                <p className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-1 text-xs font-semibold text-fg-subtle">
                  {grupo(item)}
                </p>
              ) : null}
              {href ? (
                <Link href={href(item)} className={cn(filaBase, "active:bg-fill")}>
                  {tarjeta(item)}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onSeleccionar ? () => onSeleccionar(item) : undefined}
                  className={cn(filaBase, onSeleccionar && "active:bg-fill")}
                >
                  {tarjeta(item)}
                </button>
              )}
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
                  className={cn((onSeleccionar || href) && "cursor-pointer", href && "relative")}
                >
                  {columnas.map((c, i) => (
                    <Td key={c.id} className={c.className}>
                      {href && i === 0 ? (
                        // Enlace "estirado": toda la fila navega y el nombre accesible es la primera celda.
                        <Link href={href(item)} className="after:absolute after:inset-0">
                          {c.render(item)}
                        </Link>
                      ) : (
                        c.render(item)
                      )}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
        {paginacion ? (
          <div className="mt-3 flex items-center justify-between text-base text-fg-muted">
            {paginacion}
          </div>
        ) : null}
      </Estado>
    </section>
  );
}
