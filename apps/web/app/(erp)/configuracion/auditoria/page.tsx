import { ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import {
  CAPACIDADES,
  cargarAuditoria,
  con,
  type Evento,
  RANGOS,
  rutaEntidad,
} from "./_componentes/datos";
import { Actor, cuando, resultado } from "./_componentes/actor";
import { HojaEvento } from "./_componentes/diferidas";

export const metadata = { title: "Auditoría" };

/** Auditoría (34): cada escritura, humana o de agente, con filtros y detalle en hoja lateral. */
export default function Auditoria({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Auditoría"
      ruta="/configuracion"
      volver={{ href: "/configuracion", etiqueta: "Configuración" }}
      cargar={async () => {
        const p = await leerParametros(searchParams);
        return { p, r: await cargarAuditoria(p) };
      }}
    >
      {({ p, r }) => {
        const items = r.ok ? r.data.items : [];
        const sel = items.find((x) => x.id === p["ver"]) ?? null;
        return (
          <>
            <ListScreen<Evento>
              state={estadoPantalla(r)}
              titulo="Auditoría"
              filtros={
                <ChipsFiltro
                  filtros={[
                    { param: "capacidad", etiqueta: "Capacidad", opciones: CAPACIDADES },
                    {
                      param: "actor",
                      etiqueta: "Actor",
                      opciones: [
                        { valor: "persona", etiqueta: "Personas" },
                        { valor: "agente", etiqueta: "Agentes" },
                      ],
                    },
                    { param: "rango", etiqueta: "Rango", opciones: RANGOS },
                  ]}
                />
              }
              items={items}
              clave={(e) => e.id}
              href={(e) => con(p, { ver: e.id })}
              Link={LinkNext}
              tarjeta={(e) => (
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <Actor e={e} />
                  <span className="text-base text-fg">{e.accion}</span>
                  <span className="t-caption">{cuando(e.cuando)}</span>
                </span>
              )}
              columnas={[
                {
                  id: "cuando",
                  etiqueta: "Fecha y hora",
                  render: (e) => cuando(e.cuando),
                  className: "t-numeric",
                },
                { id: "actor", etiqueta: "Actor", render: (e) => <Actor e={e} /> },
                {
                  id: "accion",
                  etiqueta: "Qué hizo",
                  render: (e) => e.accion,
                  className: "whitespace-normal",
                },
                {
                  id: "capacidad",
                  etiqueta: "Capacidad",
                  render: (e) => e.capability,
                  className: "t-mono text-sm",
                },
              ]}
              textos={{
                vacio: {
                  titulo: "Sin escrituras con estos filtros",
                  descripcion: "Cada cambio, de una persona o de un agente, queda aquí.",
                },
              }}
              {...(r.ok && r.data.siguiente
                ? {
                    paginacion: (
                      <EnlaceBoton
                        href={con(p, { cursor: r.data.siguiente, ver: null })}
                        variante="secondary"
                        className="ml-auto"
                      >
                        Ver más antiguos
                      </EnlaceBoton>
                    ),
                  }
                : {})}
            />
            <HojaEvento
              e={sel}
              cuando={sel ? `${cuando(sel.cuando)} · ${resultado(sel)}` : ""}
              entidad={rutaEntidad(sel?.entidad ?? null)}
            />
          </>
        );
      }}
    </PaginaPortal>
  );
}
