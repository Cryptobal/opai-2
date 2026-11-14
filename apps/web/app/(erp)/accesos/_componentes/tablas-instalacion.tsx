import { formatearFechaHora } from "@opai/domain";
import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import type { Intento } from "./datos";
import { MOTIVO_INTENTO, tipoDe } from "./etiquetas";

/** Tarjeta de teléfono de las tablas de la pestaña Accesos de la instalación. */
export function Tarjeta({ titulo, sub, fin }: { titulo: string; sub: string; fin: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-base font-medium text-fg">{titulo}</span>
        <Badge>{fin}</Badge>
      </span>
      <span className="t-caption">{sub}</span>
    </span>
  );
}

const motivo = (i: Intento) =>
  MOTIVO_INTENTO[i.motivo] ?? { etiqueta: i.motivo, tono: "neutro" as const };

/** Intentos denegados de una instalación (pestaña Accesos): categoría, nunca el texto del bloqueo. */
export function TablaIntentos({ state, items }: { state: EstadoPantalla; items: Intento[] }) {
  return (
    <ListScreen<Intento>
      state={state}
      titulo="Intentos denegados"
      items={items}
      clave={(i) => i.id}
      tarjeta={(i) => (
        <Tarjeta
          titulo={i.documento}
          sub={`${tipoDe(i.tipoRegistro)} · ${formatearFechaHora(i.ocurrioEn)}`}
          fin={motivo(i).etiqueta}
        />
      )}
      columnas={[
        {
          id: "doc",
          etiqueta: "Documento",
          render: (i) => <span className="t-numeric">{i.documento}</span>,
        },
        { id: "tipo", etiqueta: "Tipo", render: (i) => tipoDe(i.tipoRegistro) },
        { id: "cuando", etiqueta: "Cuándo", render: (i) => formatearFechaHora(i.ocurrioEn) },
        {
          id: "motivo",
          etiqueta: "Motivo",
          render: (i) => <Badge tono={motivo(i).tono}>{motivo(i).etiqueta}</Badge>,
        },
      ]}
      textos={{ vacio: { titulo: "Sin intentos denegados" } }}
    />
  );
}
