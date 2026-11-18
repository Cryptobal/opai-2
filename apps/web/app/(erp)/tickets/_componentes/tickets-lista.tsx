import { Badge, ListScreen } from "@opai/ds";

import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { LinkNext } from "@/app/_components/link-next";

import type { Parametros } from "@/lib/parametros";

import {
  type cargarInstalaciones,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  POR_PAGINA,
  TONO_ESTADO,
  TONO_PRIORIDAD,
  type Ticket,
  type TipoTicket,
  type cargarTickets,
} from "./datos";
import { NuevoTicket } from "./nuevo-ticket";
import { PaginacionCursor } from "@/lib/paginacion-cursor";

const OPCIONES_VISTA = [
  { valor: "mios", etiqueta: "Míos" },
  { valor: "asignados", etiqueta: "Asignados a mí" },
  { valor: "todos", etiqueta: "Todos" },
];

function TarjetaTicket({ t }: { t: Ticket }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex items-center gap-2">
        <span className="truncate text-base font-medium text-fg">{t.titulo}</span>
        <Badge tono={TONO_PRIORIDAD[t.prioridad] ?? "neutro"}>
          {ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}
        </Badge>
      </span>
      <span className="t-caption">
        {t.tipoNombre} ·{" "}
        <Badge tono={TONO_ESTADO[t.estado] ?? "neutro"}>{ETIQUETA_ESTADO[t.estado] ?? t.estado}</Badge>
      </span>
    </span>
  );
}

const COLUMNAS_TICKETS = [
  { id: "numero", etiqueta: "N.º", render: (t: Ticket) => t.numero, className: "w-24" },
  { id: "titulo", etiqueta: "Ticket", render: (t: Ticket) => t.titulo },
  { id: "tipo", etiqueta: "Tipo", render: (t: Ticket) => t.tipoNombre },
  {
    id: "prioridad",
    etiqueta: "Prioridad",
    render: (t: Ticket) => (
      <Badge tono={TONO_PRIORIDAD[t.prioridad] ?? "neutro"}>
        {ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}
      </Badge>
    ),
  },
  {
    id: "estado",
    etiqueta: "Estado",
    render: (t: Ticket) => (
      <Badge tono={TONO_ESTADO[t.estado] ?? "neutro"}>{ETIQUETA_ESTADO[t.estado] ?? t.estado}</Badge>
    ),
  },
] as const;

type Props = {
  p: Parametros;
  bandeja: Awaited<ReturnType<typeof cargarTickets>>;
  tipos: TipoTicket[];
  instalaciones: Awaited<ReturnType<typeof cargarInstalaciones>>;
};

export function TicketsLista({ p, bandeja, tipos, instalaciones }: Props) {
  const items = bandeja.items;
  return (
    <ListScreen<Ticket>
      state={bandeja.state}
      titulo="Tickets"
      accionPrincipal={<NuevoTicket tipos={tipos} instalaciones={instalaciones} />}
      buscador={<Buscador placeholder="Número, asunto o solicitante" />}
      filtros={<ChipsFiltro filtros={[{ param: "vista", etiqueta: "Vista", opciones: OPCIONES_VISTA }]} />}
      paginacion={
        <PaginacionCursor
          p={p}
          porPagina={POR_PAGINA}
          mostrados={items.length}
          siguiente={bandeja.siguiente}
          total={null}
          etiquetaCorta={`${items.length} tickets`}
        />
      }
      items={items}
      clave={(t) => t.id}
      href={(t) => `/tickets/${t.id}`}
      Link={LinkNext}
      tarjeta={(t) => <TarjetaTicket t={t} />}
      columnas={[...COLUMNAS_TICKETS]}
      textos={{
        vacio: {
          titulo: "Sin tickets",
          descripcion: "Los tickets nuevos del tipo que crees aparecerán aquí.",
        },
      }}
    />
  );
}