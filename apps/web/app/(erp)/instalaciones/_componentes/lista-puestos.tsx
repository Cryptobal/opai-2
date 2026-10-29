import type { ReactNode } from "react";

import { Badge, cn, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { BadgePuesto } from "@/app/_components/maestros/badge-puesto";
import { ESTADO_PUESTO, estadoDe } from "@/app/_components/maestros/estados";
import type { Puesto } from "@/lib/tipos-maestros";

import { CoberturaPuesto, Horario, secundario, terciario } from "./celdas-puesto";

/**
 * Lista de puestos (review 5662449808 punto 3): `ListScreen` del DS 2.0 (filas en teléfono, tabla
 * desde tablet), con los estados vacío, cargando y error que ya trae el patrón. `sinCabecera`: el
 * título, el subtítulo con los conteos y «Nuevo puesto» van en la pestaña (Brief 11, diseño t436u),
 * no en el patrón.
 */
export function ListaPuestos({
  state,
  puestos,
  buscador,
  filtros,
  accionVacio,
}: {
  state: EstadoPantalla;
  puestos: readonly Puesto[];
  buscador?: ReactNode;
  filtros?: ReactNode;
  accionVacio?: ReactNode;
}) {
  return (
    <div className="@container">
      <ListScreen<Puesto>
        state={state}
        titulo="Puestos"
        sinCabecera
        buscador={buscador}
        filtros={filtros}
        items={puestos}
        clave={(p) => p.id}
        href={(p) => `?puesto=${p.id}`}
        Link={LinkNext}
        tarjeta={(p) => {
          const inactivo = p.estado !== "activo";
          return (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate text-base font-medium", inactivo && "text-fg-muted")}>
                  {p.nombre}
                </span>
                <span className="truncate text-sm text-fg-muted">{secundario(p)}</span>
                <span className="t-caption truncate">{terciario(p)}</span>
              </span>
              <span className="flex flex-none flex-col items-end gap-1">
                <BadgePuesto estado={p.estado} cobertura={p.cobertura} />
              </span>
            </>
          );
        }}
        columnas={[
          {
            id: "puesto",
            etiqueta: "Puesto",
            className: "min-w-24 font-medium whitespace-normal wrap-break-word",
            render: (p) => (
              <span className={cn("flex flex-col", p.estado !== "activo" && "text-fg-muted")}>
                <span>{p.nombre}</span>
                <span className="t-caption text-fg-muted 2xl:hidden">{p.patron ?? "—"}</span>
              </span>
            ),
          },
          {
            id: "funcion",
            etiqueta: "Función",
            className: "hidden 2xl:table-cell",
            render: (p) => p.funcion ?? "—",
          },
          {
            id: "horario",
            etiqueta: "Horario",
            className: "h-auto whitespace-normal py-2.5",
            render: (p) => (
              <span className="flex flex-col gap-0.5">
                <Horario valor={p.horario} />
                {p.horarioNoche ? <Horario valor={p.horarioNoche} /> : null}
              </span>
            ),
          },
          {
            id: "patron",
            etiqueta: "Patrón",
            className: "hidden t-numeric 2xl:table-cell",
            render: (p) => p.patron ?? "—",
          },
          {
            id: "cobertura",
            etiqueta: "Cobertura",
            render: (p) => {
              if (p.estado !== "activo") return "—";
              return <CoberturaPuesto cobertura={p.cobertura} />;
            },
          },
          {
            id: "estado",
            etiqueta: "Estado",
            render: (p) => {
              const e = estadoDe(ESTADO_PUESTO, p.estado);
              return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
            },
          },
        ]}
        textos={{
          vacio: {
            titulo: "Sin puestos",
            descripcion: "Crea el primero o ajusta la búsqueda y los filtros.",
            accion: accionVacio,
          },
        }}
      />
    </div>
  );
}
