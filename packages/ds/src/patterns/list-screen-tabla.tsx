import type { ReactNode } from "react";

import { cn } from "../cn";
import { Table, Td, Th, Tr } from "../components/table";
import type { LinkComponent } from "../shell/types";
import type { Columna, SeleccionTabla } from "./list-screen";

type Props<T> = {
  items: readonly T[];
  clave: (item: T) => string;
  columnas: readonly Columna<T>[];
  Link: LinkComponent;
  href?: (item: T) => string;
  onSeleccionar?: (item: T) => void;
  acciones?: (item: T) => ReactNode;
  seleccion?: SeleccionTabla<T>;
};

/** Tabla de `ListScreen` en md+, con la fila como enlace estirado y, opcional, selección (D4a). */
export function TablaLista<T>({
  items,
  clave,
  columnas,
  Link,
  href,
  onSeleccionar,
  acciones,
  seleccion,
}: Props<T>) {
  return (
    <TablaConSeleccion envolver={seleccion?.envolver} visibles={items.map(clave)}>
      <Table>
        <thead>
          <tr>
            {seleccion ? <Th className="w-px">{seleccion.cabecera}</Th> : null}
            {columnas.map((c) => (
              <Th key={c.id} className={c.className}>
                {c.etiqueta}
              </Th>
            ))}
            {acciones ? (
              <Th className="w-px">
                <span className="sr-only">Acciones</span>
              </Th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Tr
              key={clave(item)}
              onClick={onSeleccionar ? () => onSeleccionar(item) : undefined}
              className={cn((onSeleccionar || href) && "cursor-pointer", href && "relative")}
            >
              {seleccion ? <Td className="w-px">{seleccion.celda(item)}</Td> : null}
              {columnas.map((c, i) => (
                <Td key={c.id} className={c.className}>
                  {href && i === 0 ? (
                    // Enlace "estirado": toda la fila navega y el nombre accesible es la primera celda.
                    // Con acciones, el ::after no se come el clic: el menú y el nombre sí lo reciben.
                    <Link
                      href={href(item)}
                      className={cn(
                        "after:absolute after:inset-0",
                        acciones && "after:pointer-events-none",
                      )}
                    >
                      {c.render(item)}
                    </Link>
                  ) : (
                    c.render(item)
                  )}
                </Td>
              ))}
              {acciones ? <Td className="relative z-10 text-right">{acciones(item)}</Td> : null}
            </Tr>
          ))}
        </tbody>
      </Table>
    </TablaConSeleccion>
  );
}

/** Tabla de md+; con selección, la pantalla la envuelve con su estado y su barra de acciones. */
function TablaConSeleccion(p: {
  envolver?: ((tabla: ReactNode, visibles: string[]) => ReactNode) | undefined;
  visibles: string[];
  children: ReactNode;
}) {
  const tabla = <div className="hidden md:block">{p.children}</div>;
  return p.envolver ? p.envolver(tabla, p.visibles) : tabla;
}
