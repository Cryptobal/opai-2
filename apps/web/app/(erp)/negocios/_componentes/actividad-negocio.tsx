import { Empty, SeccionTarjeta } from "@opai/ds";

import { fecha } from "@/lib/fechas";

import type { NegocioDetalle } from "./datos";

const dias = (d: number | null) =>
  d == null ? "" : d === 0 ? " · menos de un día" : ` · ${d} ${d === 1 ? "día" : "días"}`;

/** Tab Actividad: por ahora, los cambios de etapa (R11). Notas, llamadas y tareas llegan en el PR 2. */
export function ActividadNegocio({ n }: { n: NegocioDetalle }) {
  if (!n.historial.length) {
    return (
      <Empty
        titulo="Sin actividad"
        descripcion="Los cambios de etapa, notas y tareas aparecerán aquí."
      />
    );
  }
  return (
    <SeccionTarjeta titulo="Historial de etapas">
      <ol className="flex flex-col gap-3">
        {[...n.historial].reverse().map((h) => (
          <li key={h.id} className="flex flex-col border-l-2 border-border pl-3">
            <span className="font-medium">{h.de ? `${h.de} → ${h.a}` : `Creado en ${h.a}`}</span>
            <span className="t-caption">
              {fecha(h.cuando)}
              {h.de ? dias(h.dias) : ""}
              {h.motivo ? ` · ${h.motivo}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </SeccionTarjeta>
  );
}
