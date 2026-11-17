import { Badge, ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { PaginacionCursor } from "@/app/_components/maestros/paginacion-cursor";
import { LinkNext } from "@/app/_components/link-next";
import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";

import { NuevoTicket } from "./nuevo-ticket";
import {
  type cargarTickets,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  TONO_ESTADO,
  TONO_PRIORIDAD,
  type InstalacionOpcion,
  type Ticket,
  type TipoTicket,
} from "./datos";

const OPCIONES_VISTA = [
  { valor: "mios", etiqueta: "Míos" },
  { valor: "asignados", etiqueta: "Asignados a mí" },
  { valor: "todos", etiqueta: "Todos" },
];

type ResTickets = Awaited<ReturnType<typeof cargarTickets>>;

export function ListaTicketsPantalla({
  p,
  r,
  tipos,
  instalaciones,
}: {
  p: Parametros;
  r: ResTickets;
  tipos: TipoTicket[];
  instalaciones: InstalacionOpcion[];
}) {
  const items = r.ok ? r.data.items : [];
  const siguiente = r.ok ? r.data.siguiente : null;
  return (
    <ListScreen<Ticket>
      state={estadoPantalla(r)}
      titulo="Tickets"
      accionPrincipal={<NuevoTicket tipos={tipos} instalaciones={instalaciones} />}
      filtros={<ChipsFiltro filtros={[{ param: "vista", etiqueta: "Vista", opciones: OPCIONES_VISTA }]} />}
      paginacion={
        <PaginacionCursor p={p} mostrados={items.length} siguiente={siguiente} total={null} />
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
}