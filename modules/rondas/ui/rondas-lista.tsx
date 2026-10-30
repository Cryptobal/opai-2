import { type EstadoPantalla, ListScreen } from "@opai/ds";

import type { ModoPunto } from "@opai/domain";

const MODO: Record<ModoPunto, string> = { qr: "QR", gps: "GPS", qr_gps: "QR + GPS" };

export type PuntoResumen = {
  id: string;
  nombre: string;
  modo: ModoPunto;
  radioM: number | null;
  orden?: number;
};

type Props = { state: EstadoPantalla; puntos: readonly PuntoResumen[] };

/**
 * Resumen presentacional de los puntos de una ronda (DS 2.0): nombre, modo y radio, con filas en
 * teléfono y tabla desde tablet. Es la pieza propia del módulo para listar puntos; las pantallas de
 * configuración del ERP viven en `apps/web`. Reemplaza el ejemplo del andamiaje (#137, H2).
 */
export function PuntosResumen({ state, puntos }: Props) {
  return (
    <ListScreen<PuntoResumen>
      state={state}
      titulo="Puntos"
      sinCabecera
      items={puntos}
      clave={(p) => p.id}
      tarjeta={(p) => (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-medium">
            {p.orden != null ? `${p.orden + 1}. ` : ""}
            {p.nombre}
          </span>
          <span className="t-caption truncate">
            {MODO[p.modo]}
            {p.radioM != null ? ` · ${p.radioM} m` : ""}
          </span>
        </span>
      )}
      columnas={[
        {
          id: "nombre",
          etiqueta: "Punto",
          render: (p) => (p.orden != null ? `${p.orden + 1}. ${p.nombre}` : p.nombre),
        },
        { id: "modo", etiqueta: "Modo", render: (p) => MODO[p.modo] },
        {
          id: "radio",
          etiqueta: "Radio",
          className: "t-numeric",
          render: (p) => (p.radioM != null ? `${p.radioM} m` : "—"),
        },
      ]}
    />
  );
}
