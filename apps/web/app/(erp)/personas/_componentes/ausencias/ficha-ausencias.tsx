import { CalendarOff } from "lucide-react";

import { Badge, Estado } from "@opai/ds";

import { fecha } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { AnularAusencia } from "./anular-ausencia";
import { etiquetaTipo, type GrupoAusencia } from "./tipos";

const TONO = {
  licencia: "warning",
  permiso: "info",
  vacaciones: "success",
  ausencia: "danger",
} as const;

const rango = (g: GrupoAusencia) =>
  g.desde === g.hasta ? fecha(g.desde) : `${fecha(g.desde)} al ${fecha(g.hasta)}`;

/**
 * Pestaña de la ficha: permisos, licencias, vacaciones y ausencias de la persona tal como están en la pauta
 * (ADR-094, adenda CAR-311 d). Lo mismo se ve en la pauta mensual y diaria; anular devuelve los turnos a su serie.
 */
export async function FichaAusencias({
  personaId,
  puedeEditar,
}: {
  personaId: string;
  puedeEditar: boolean;
}) {
  const r = await ejecutarComoUsuario<{ grupos: GrupoAusencia[] }>(
    "erp",
    "pauta.ausencias.listar",
    { personaId },
  );
  const grupos = r.ok ? r.data.grupos : [];
  return (
    <Estado
      state={r.ok && grupos.length === 0 ? "empty" : estadoPantalla(r)}
      variante="lista"
      textos={{
        vacio: {
          titulo: "Sin permisos ni licencias",
          descripcion:
            "Lo que registres aquí se ve en la pauta mensual y diaria, y sus turnos quedan por cubrir.",
        },
      }}
    >
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {grupos.map((g) => (
          <li
            key={`${g.registradaEn}-${g.tipo}-${g.estado}`}
            className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <span
              aria-hidden
              className="flex size-9 flex-none items-center justify-center rounded-md bg-fill text-fg-muted"
            >
              <CalendarOff className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base font-medium text-fg">{etiquetaTipo(g.tipo)}</span>
                {g.estado === "anulada" ? (
                  <Badge tono="neutro">Anulada</Badge>
                ) : (
                  <Badge tono={TONO[g.tipo]}>{g.dias === 1 ? "1 turno" : `${g.dias} turnos`}</Badge>
                )}
              </span>
              <span className="block truncate text-sm text-fg-muted">
                {rango(g)} · {g.instalaciones.join(", ")}
              </span>
              <span className="block truncate t-caption">{g.motivo}</span>
            </span>
            {puedeEditar && g.estado === "activa" ? (
              <AnularAusencia personaId={personaId} g={g} />
            ) : null}
          </li>
        ))}
      </ul>
    </Estado>
  );
}
