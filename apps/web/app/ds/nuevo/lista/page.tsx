import { notFound } from "next/navigation";

import { ListScreen } from "@opai/ds";
import { seleccionDeLista } from "@opai/ds/seleccion";

import { AccionMuestra } from "./accion-muestra";

export const metadata = { title: "Diseño · lista con selección" };

type Fila = { id: string; nombre: string; estado: string };
const FILAS: Fila[] = [
  { id: "1", nombre: "[CUENTA A]", estado: "Activa" },
  { id: "2", nombre: "[CUENTA B]", estado: "Por vencer" },
  { id: "3", nombre: "[CUENTA C]", estado: "Borrador" },
];

/**
 * Muestra de la lista con selección de varias filas (ADR-109, CAR-335 D4a), con la piel nueva. Sin
 * sesión y solo fuera de producción, como `/ds/nuevo`. Datos marcadores, sin datos reales.
 */
export default function PaginaListaNueva() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div data-marco="nuevo" data-testid="muestra-lista" className="min-h-dvh bg-bg p-6 text-fg">
      <ListScreen<Fila>
        state="ready"
        titulo="Cuentas"
        items={FILAS}
        clave={(f) => f.id}
        tarjeta={(f) => <span>{f.nombre}</span>}
        columnas={[
          { id: "nombre", etiqueta: "Nombre", render: (f) => f.nombre },
          { id: "estado", etiqueta: "Estado", render: (f) => f.estado },
        ]}
        seleccion={seleccionDeLista<Fila>(
          (f) => f.id,
          (f) => f.nombre,
          <AccionMuestra />,
        )}
      />
    </div>
  );
}
