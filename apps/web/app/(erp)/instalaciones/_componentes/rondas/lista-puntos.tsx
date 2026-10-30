import type { ReactNode } from "react";

import { Badge, cn, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { MODO_PUNTO } from "./etiquetas";
import type { Punto } from "./tipos";

const m = (v: number | null, u: string) => (v != null ? `${v} ${u}` : "—");

/** Lista de puntos de control (c13p): tabla desde tablet, filas en teléfono. Abre el drawer `?punto=`. */
export function ListaPuntos({
  state,
  puntos,
  accionVacio,
}: {
  state: EstadoPantalla;
  puntos: readonly Punto[];
  accionVacio?: ReactNode;
}) {
  return (
    <div className="@container">
      <ListScreen<Punto>
        state={state}
        titulo="Puntos"
        sinCabecera
        items={puntos}
        clave={(p) => p.id}
        href={(p) => `?punto=${p.id}`}
        Link={LinkNext}
        tarjeta={(p) => {
          const inactivo = p.estado !== "activo";
          return (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate text-base font-medium", inactivo && "text-fg-muted")}>
                  {p.nombre}
                </span>
                <span className="t-caption truncate">
                  {MODO_PUNTO[p.modo]} · radio {m(p.radioM, "m")} · {m(p.permanenciaS, "s")}
                </span>
              </span>
              <Badge tono={inactivo ? "neutro" : "success"}>{inactivo ? "Archivado" : "Activo"}</Badge>
            </>
          );
        }}
        columnas={[
          {
            id: "nombre",
            etiqueta: "Punto",
            className: "min-w-24 font-medium whitespace-normal wrap-break-word",
            render: (p) => (
              <span className={cn("flex flex-col", p.estado !== "activo" && "text-fg-muted")}>
                <span>{p.nombre}</span>
                {p.exigeFoto ? <span className="t-caption">Pide foto</span> : null}
              </span>
            ),
          },
          { id: "modo", etiqueta: "Modo", render: (p) => MODO_PUNTO[p.modo] },
          { id: "radio", etiqueta: "Radio", className: "t-numeric", render: (p) => m(p.radioM, "m") },
          {
            id: "precision",
            etiqueta: "Precisión mín.",
            className: "hidden t-numeric lg:table-cell",
            render: (p) => m(p.precisionMinM, "m"),
          },
          {
            id: "permanencia",
            etiqueta: "Permanencia",
            className: "hidden t-numeric lg:table-cell",
            render: (p) => m(p.permanenciaS, "s"),
          },
          {
            id: "estado",
            etiqueta: "Estado",
            render: (p) => (
              <Badge tono={p.estado !== "activo" ? "neutro" : "success"}>
                {p.estado !== "activo" ? "Archivado" : "Activo"}
              </Badge>
            ),
          },
        ]}
        textos={{
          vacio: {
            titulo: "Aún no hay puntos",
            descripcion: "Crea el primer punto de control para armar plantillas y programar rondas.",
            accion: accionVacio,
          },
        }}
      />
    </div>
  );
}
