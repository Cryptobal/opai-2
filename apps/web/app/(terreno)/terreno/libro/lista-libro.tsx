import { formatearFechaHora } from "@opai/domain";
import { Badge } from "@opai/ds";

import type { NovedadLibro } from "./usar-libro";

const TONO = { baja: "neutro", media: "warning", alta: "danger" } as const;
const GRAVEDAD = { baja: "Baja", media: "Media", alta: "Incidente" } as const;
const ESTADO: Record<string, string> = {
  abierta: "Abierta",
  en_atencion: "En atención",
  resuelta: "Resuelta",
  cerrada: "Cerrada",
  derivada: "Derivada",
};

/** Las novedades del libro: número NOV, fecha y hora, quién (si fue quien usa el equipo), gravedad y estado. */
export function ListaLibro({ items, personaId }: { items: NovedadLibro[]; personaId: string }) {
  return (
    <ul
      aria-label="Novedades"
      className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface"
    >
      {items.map((n) => (
        <li key={n.id} className="flex flex-col gap-1 p-3">
          <p className="text-sm text-fg-muted">
            {n.codigo} · {formatearFechaHora(n.horaHecho)}
            {n.personaId === personaId ? " · tú" : ""}
          </p>
          <p className="text-fg">{n.resumen}</p>
          <div className="flex gap-2">
            <Badge tono={TONO[n.gravedad]}>{GRAVEDAD[n.gravedad]}</Badge>
            <Badge>{ESTADO[n.estado] ?? n.estado}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
