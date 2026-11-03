import { Badge, type EstadoPantalla } from "@opai/ds";

import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conBusqueda } from "@/lib/parametros";

import { ESTADO_PERIODO } from "./etiquetas";
import type { Periodo } from "./tipos";

/** Columna de períodos (diseño 01): lista con ficha a la derecha, sin tarjetas apiladas. */
export function ListaPeriodosColumna({
  state,
  periodos,
  seleccionado,
  q,
}: {
  state: EstadoPantalla;
  periodos: Periodo[];
  seleccionado?: string;
  q?: string;
}) {
  const actual = periodos.find((p) => p.estado !== "pagado") ?? periodos[0];
  return (
    <ListaMaestro
      state={state}
      titulo="Períodos"
      buscar="Buscar período"
      meta={{
        izquierda: `${periodos.length} ${periodos.length === 1 ? "período" : "períodos"}`,
        derecha: "Más reciente primero",
      }}
      seleccionada={seleccionado}
      vacio={{
        titulo: "Aún no hay períodos",
        descripcion: "Abre el primer período para empezar a cargar novedades del mes.",
      }}
      filas={periodos.map((p) => {
        const est = ESTADO_PERIODO[p.estado];
        return {
          id: p.id,
          href: conBusqueda(`/remuneraciones/${p.id}`, q),
          titulo: p.etiqueta + (p.id === actual?.id ? " · actual" : ""),
          secundario: (
            <>
              <Badge tono={est.tono} punto className="mr-1">
                {est.etiqueta}
              </Badge>
              <span>{p.novedades} novedades vigentes</span>
            </>
          ),
        };
      })}
    />
  );
}
