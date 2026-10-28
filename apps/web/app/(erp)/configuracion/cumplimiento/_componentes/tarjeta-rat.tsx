import { Badge, SeccionTarjeta } from "@opai/ds";

import type { Actividad } from "./datos";

/**
 * Registro de actividades de tratamiento (RAT), en solo lectura, armado del inventario declarado. El
 * detalle de retención por dato vive en la pestaña Retención (no se repite aquí).
 */
export function TarjetaRat({
  actividades,
  propuestas,
}: {
  actividades: Actividad[];
  propuestas: boolean;
}) {
  return (
    <SeccionTarjeta titulo="Registro de actividades de tratamiento" sinRelleno>
      {propuestas ? (
        <p className="t-caption border-b border-border px-4 py-2">
          Bases de licitud y plazos propuestos: se confirman con asesoría legal.
        </p>
      ) : null}
      <ul className="divide-y divide-border">
        {actividades.map((a) => (
          <li key={a.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-medium text-fg">{a.actividad}</span>
              <Badge punto={false}>{a.base}</Badge>
              {a.retencionPendiente ? <Badge tono="warning">Retención pendiente</Badge> : null}
            </div>
            {a.destinatarios.length ? (
              <p className="t-caption">Destinatarios: {a.destinatarios.join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </SeccionTarjeta>
  );
}
