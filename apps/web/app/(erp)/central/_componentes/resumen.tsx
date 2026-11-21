import { Badge } from "@opai/ds";

import { type EstadoCentral, ETIQUETA_SEVERIDAD, SEVERIDADES, TONO_SEVERIDAD } from "./datos";

/** Foto en vivo bajo el título: activas por severidad y pospuestas (central.estado). */
export function ResumenCentral({ estado }: { estado: EstadoCentral }) {
  const total = SEVERIDADES.reduce((n, s) => n + (estado.activas[s] ?? 0), 0);
  if (total === 0 && estado.pospuestas === 0) return <span>Sin alertas activas</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>
        {total} {total === 1 ? "alerta activa" : "alertas activas"}
      </span>
      {SEVERIDADES.filter((s) => (estado.activas[s] ?? 0) > 0).map((s) => (
        <Badge key={s} tono={TONO_SEVERIDAD[s] ?? "neutro"}>
          {estado.activas[s]} {ETIQUETA_SEVERIDAD[s]?.toLowerCase()}
        </Badge>
      ))}
      {estado.pospuestas > 0 ? <span>· {estado.pospuestas} pospuestas</span> : null}
    </span>
  );
}
