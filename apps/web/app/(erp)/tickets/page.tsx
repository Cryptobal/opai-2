import { Badge, ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";

import {
  cargarTickets,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  filtrosDe,
  TONO_ESTADO,
  TONO_PRIORIDAD,
  type Ticket,
} from "./_componentes/datos";

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
        return { p, r: await cargarTickets(p) };
      }}
    >
      {({ r }) => {
        const items = r.ok ? r.data.items : [];
        return (
          <ListScreen<Ticket>
            state={estadoPantalla(r)}
            titulo="Tickets"
            filtros={<ChipsFiltro filtros={[{ param: "vista", etiqueta: "Vista", opciones: OPCIONES_VISTA }]} />}
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
      }}
    </PaginaPortal>
  );
}
