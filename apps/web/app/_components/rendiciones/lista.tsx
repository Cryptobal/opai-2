import type { ReactNode } from "react";

import { Estado, type EstadoPantalla } from "@opai/ds";

import { TablaRendiciones, TarjetaRendicion } from "./lista-tarjeta";
import { type PortalRendicion, type ResumenRendicion } from "./tipos";

/** «Mis rendiciones»: tarjetas en teléfono y tabla en md+; estados vacío, error y sin permiso del patrón. */
export function ListaRendiciones({
  state,
  items,
  portal,
  textos,
  pie,
}: {
  state: EstadoPantalla;
  items: readonly ResumenRendicion[];
  portal: PortalRendicion;
  textos: { titulo: string; descripcion: string; accion?: React.ReactNode };
  pie?: ReactNode;
}) {
  return (
    <Estado
      state={state === "ready" && items.length === 0 ? "empty" : state}
      variante="lista"
      textos={{
        vacio: {
          titulo: textos.titulo,
          descripcion: textos.descripcion,
          ...(textos.accion ? { accion: textos.accion } : {}),
        },
      }}
    >
      <ul className="flex flex-col gap-3 md:hidden">
        {items.map((r) => (
          <li key={r.id}>
            <TarjetaRendicion r={r} portal={portal} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <TablaRendiciones items={items} portal={portal} />
      </div>
      {pie}
    </Estado>
  );
}