import { Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { fechaCorta } from "@/lib/formato";

import { AccionesPeriodo } from "./acciones-periodo";
import { ESTADO_PERIODO } from "./etiquetas";
import type { Periodo } from "./tipos";

/** Panel derecho de un período: estado, fechas y acciones del cierre. */
export function DetallePeriodo({
  periodo,
  state,
  gestiona,
  puedePagar,
  puedeVerNovedades,
}: {
  periodo: Periodo | null;
  state: EstadoPantalla;
  gestiona: boolean;
  puedePagar: boolean;
  puedeVerNovedades: boolean;
}) {
  const est = periodo ? ESTADO_PERIODO[periodo.estado] : null;
  return (
    <DetailScreen
      state={periodo ? state : state === "ready" ? "error" : state}
      titulo={periodo?.etiqueta ?? "Período"}
      {...(periodo && est
        ? {
            estado: (
              <Badge tono={est.tono} punto>
                {est.etiqueta}
              </Badge>
            ),
            subtitulo: (
              <>
                {fechaCorta(periodo.inicio)} – {fechaCorta(periodo.fin)} · cierre previsto{" "}
                {fechaCorta(periodo.cierrePrevisto)}
              </>
            ),
          }
        : {})}
    >
      {periodo ? (
        <div className="flex flex-col gap-4">
          <p className="t-caption">{periodo.novedades} novedades vigentes</p>
          {periodo.motivoReapertura && periodo.estado !== "pagado" ? (
            <p className="t-caption">Última devolución: {periodo.motivoReapertura}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {puedeVerNovedades ? (
              <EnlaceBoton href={`/remuneraciones/novedades?periodo=${periodo.id}`} variante="ghost">
                Ver novedades
              </EnlaceBoton>
            ) : null}
            {gestiona ? <AccionesPeriodo periodo={periodo} puedePagar={puedePagar} /> : null}
          </div>
        </div>
      ) : null}
    </DetailScreen>
  );
}
