import { type EstadoPantalla, ListScreen } from "@opai/ds";

type Fila = { id: string; nombre: string };

type Props = { state: EstadoPantalla; filas: readonly Fila[] };

/** Pantalla de ejemplo con el patrón ListScreen. Reemplazar por la lista real del módulo. */
export function CpqLista({ state, filas }: Props) {
  return (
    <ListScreen<Fila>
      state={state}
      titulo="CPQ"
      items={filas}
      clave={(f) => f.id}
      tarjeta={(f) => <span className="font-medium">{f.nombre}</span>}
      columnas={[{ id: "nombre", etiqueta: "Nombre", render: (f) => f.nombre }]}
    />
  );
}
