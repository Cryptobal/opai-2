import type { ReactNode } from "react";

import { formatearFechaHora } from "@opai/domain";
import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import type { Intento } from "./datos";
import { MOTIVO_INTENTO, tipoDe } from "./etiquetas";

const motivo = (i: Intento) => {
  const m = MOTIVO_INTENTO[i.motivo] ?? { etiqueta: i.motivo, tono: "neutro" as const };
  return (
    <Badge tono={m.tono} punto>
      {m.etiqueta}
    </Badge>
  );
};

/** Intentos denegados (R9): documento enmascarado, tipo, instalación, hora y categoría; nunca el texto del bloqueo. */
export function TablaIntentos({
  state,
  items,
  filtros,
}: {
  state: EstadoPantalla;
  items: Intento[];
  filtros?: ReactNode;
}) {
  return (
    <ListScreen<Intento>
      state={state}
      titulo="Intentos denegados"
      {...(filtros ? { filtros } : {})}
      items={items}
      clave={(i) => i.id}
      tarjeta={(i) => (
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <span className="t-numeric truncate text-base text-fg">{i.documento}</span>
            {motivo(i)}
          </span>
          <span className="t-caption">
            {tipoDe(i.tipoRegistro)} · {i.instalacion} · {formatearFechaHora(i.ocurrioEn)}
          </span>
        </span>
      )}
      columnas={[
        { id: "documento", etiqueta: "Documento", render: (i) => i.documento },
        { id: "tipo", etiqueta: "Tipo", render: (i) => tipoDe(i.tipoRegistro) },
        { id: "instalacion", etiqueta: "Instalación", render: (i) => i.instalacion },
        { id: "cuando", etiqueta: "Cuándo", render: (i) => formatearFechaHora(i.ocurrioEn) },
        { id: "motivo", etiqueta: "Motivo", render: motivo },
      ]}
      textos={{
        vacio: {
          titulo: "Sin intentos denegados",
          descripcion: "Si la portería rechaza a alguien por lista u horario, aparecerá aquí.",
        },
      }}
    />
  );
}
