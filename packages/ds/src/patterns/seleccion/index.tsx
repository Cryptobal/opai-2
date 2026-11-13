import type { ReactNode } from "react";

import type { SeleccionTabla } from "../list-screen";
import { BarraSeleccionLista, CasillaFila, CasillaTodas, ProveedorSeleccion } from "./piezas";

export { useSeleccion } from "./piezas";

/**
 * Selección de varias filas para `ListScreen` (ADR-109, CAR-335 D4a), en su propio punto de entrada
 * (`@opai/ds/seleccion`) para que solo las listas que la usan descarguen sus casillas y su barra.
 * `acciones` son componentes de la pantalla que leen los ids con `useSeleccion` y llaman a su
 * capacidad masiva, que autoriza fila por fila.
 */
export function seleccionDeLista<T>(
  items: readonly T[],
  clave: (item: T) => string,
  etiqueta: (item: T) => string,
  acciones: ReactNode,
): SeleccionTabla<T> {
  const visibles = items.map(clave);
  return {
    cabecera: <CasillaTodas />,
    celda: (item) => <CasillaFila id={clave(item)} etiqueta={etiqueta(item)} />,
    envolver: (tabla) => (
      <ProveedorSeleccion visibles={visibles}>
        {tabla}
        <BarraSeleccionLista acciones={acciones} />
      </ProveedorSeleccion>
    ),
  };
}
