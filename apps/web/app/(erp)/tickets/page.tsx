import { Badge, ListScreen } from "@opai/ds";

import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { NuevoTicket } from "./_componentes/nuevo-ticket";
import {
  cargarInstalaciones,
  cargarTickets,
  cargarTipos,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  filtrosDe,
  TONO_ESTADO,
  TONO_PRIORIDAD,
  type Ticket,
} from "./_componentes/datos";
import { PaginacionTickets } from "./_componentes/paginacion";

export const metadata = { title: "Tickets" };
type Props = { searchParams: SearchParams };

const OPCIONES_VISTA = [
  { valor: "mios", etiqueta: "Míos" },
  { valor: "asignados", etiqueta: "Asignados a mí" },
  { valor: "todos", etiqueta: "Todos" },
];

/** Bandeja de tickets (modulos/tickets.md §3): pestañas Míos, Asignados a mí y Todos. */
export default function Tickets({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Tickets"
      ruta="/tickets"
      completo
      cargar={async () => {
        const p = await filtrosDe(searchParams);
        const [bandeja, tipos, instalaciones] = await Promise.all([
          cargarTickets(p),
          cargarTipos(),
          cargarInstalaciones(),
        ]);
        return { p, bandeja, tipos: tipos.ok ? tipos.data : [], instalaciones };
      }}
    >
      {({ p, bandeja, tipos, instalaciones }) => {
        const items = bandeja.items;
        return (
          <ListScreen<Ticket>
            state={bandeja.state}
            titulo="Tickets"
            accionPrincipal={<NuevoTicket tipos={tipos} instalaciones={instalaciones} />}
            buscador={<Buscador placeholder="Número, asunto o solicitante" />}
            filtros={<ChipsFiltro filtros={[{ param: "vista", etiqueta: "Vista", opciones: OPCIONES_VISTA }]} />}
            paginacion={
              <PaginacionTickets p={p} mostrados={items.length} siguiente={bandeja.siguiente} />
            }
            items={items}
            clave={(t) => t.id}
            href={(t) => `/tickets/${t.id}`}
            Link={LinkNext}
            tarjeta={(t) => (
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-base font-medium text-fg">{t.titulo}</span>
                  <Badge tono={TONO_PRIORIDAD[t.prioridad] ?? "neutro"}>
                    {ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}
                  </Badge>
                </span>
                <span className="t-caption">
                  {t.tipoNombre} ·{" "}
                  <Badge tono={TONO_ESTADO[t.estado] ?? "neutro"}>
                    {ETIQUETA_ESTADO[t.estado] ?? t.estado}
                  </Badge>
                </span>
              </span>
            )}
            columnas={[
              { id: "numero", etiqueta: "N.º", render: (t) => t.numero, className: "w-24" },
              { id: "titulo", etiqueta: "Ticket", render: (t) => t.titulo },
              { id: "tipo", etiqueta: "Tipo", render: (t) => t.tipoNombre },
              {
                id: "prioridad",
                etiqueta: "Prioridad",
                render: (t) => (
                  <Badge tono={TONO_PRIORIDAD[t.prioridad] ?? "neutro"}>
                    {ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}
                  </Badge>
                ),
              },
              {
                id: "estado",
                etiqueta: "Estado",
                render: (t) => (
                  <Badge tono={TONO_ESTADO[t.estado] ?? "neutro"}>
                    {ETIQUETA_ESTADO[t.estado] ?? t.estado}
                  </Badge>
                ),
              },
            ]}
            textos={{
              vacio: {
                titulo: "Sin tickets",
                descripcion: "Los tickets nuevos del tipo que crees aparecerán aquí.",
              },
            }}
          />
        );
      }}
    </PaginaPortal>
  );
}
