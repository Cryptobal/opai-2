import type { ReactNode } from "react";

import { Badge, type Columna, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { Tarjeta } from "../../_componentes/tablas-instalacion";
import type { Prerregistro } from "./datos";
import { estadoPrerregistro, horario, rango } from "./etiquetas";

const nombres = (p: Prerregistro) => p.visitantes.map((v) => v.nombre).join(", ");

const estado = (p: Prerregistro) => {
  const e = estadoPrerregistro(p);
  return (
    <Badge tono={e.tono} punto>
      {e.etiqueta}
    </Badge>
  );
};

const COLUMNAS: Columna<Prerregistro>[] = [
  { id: "visitantes", etiqueta: "Visitantes", render: nombres },
  { id: "instalacion", etiqueta: "Instalación", render: (p) => p.instalacion },
  { id: "fecha", etiqueta: "Fecha", render: rango },
  { id: "horario", etiqueta: "Horario", render: (p) => horario(p.desdeMin, p.hastaMin) },
  { id: "anfitrion", etiqueta: "Anfitrión", render: (p) => p.anfitrion },
  { id: "estado", etiqueta: "Estado", render: estado },
];

/** Prerregistros vigentes y próximos (diseño `Prerregistrar`, lista de esperados). */
export function ListaPrerregistros({
  state,
  items,
  accion,
  filtros,
  paginacion,
}: {
  state: EstadoPantalla;
  items: Prerregistro[];
  accion?: ReactNode;
  filtros?: ReactNode;
  paginacion?: ReactNode;
}) {
  return (
    <ListScreen<Prerregistro>
      state={state}
      titulo="Prerregistros"
      {...(accion ? { accionPrincipal: accion } : {})}
      items={items}
      clave={(p) => p.id}
      tarjeta={(p) => (
        <Tarjeta
          titulo={nombres(p)}
          sub={`${p.instalacion} · ${rango(p)} · ${horario(p.desdeMin, p.hastaMin)}`}
          fin={estadoPrerregistro(p).etiqueta}
        />
      )}
      href={(p) => `/accesos/prerregistros/${p.id}`}
      Link={LinkNext}
      columnas={COLUMNAS}
      textos={{
        vacio: {
          titulo: "Sin visitas prerregistradas",
          descripcion:
            "Prerregistra una visita y el guardia la verá como autorizada el día que llegue.",
        },
      }}
      {...(filtros ? { filtros } : {})}
      {...(paginacion ? { paginacion } : {})}
    />
  );
}
