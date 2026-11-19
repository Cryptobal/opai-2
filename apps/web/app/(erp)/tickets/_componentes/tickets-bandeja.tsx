import { Badge, ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { LinkNext } from "@/app/_components/link-next";
import { estadoPantalla } from "@/lib/formato";

import {
  CONFIG_TIPOS_TICKET,
  MOTIVO_SIN_TIPOS_TICKET,
  NuevoTicket,
} from "./nuevo-ticket";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, TONO_ESTADO, TONO_PRIORIDAD } from "./datos";
import type { InstalacionOpcion, RespuestaTicketsLista, Ticket, TipoTicket } from "./datos";
import { COLUMNAS_TICKETS } from "./tickets-columnas";

const OPCIONES_VISTA = [
  { valor: "mios", etiqueta: "Míos" },
  { valor: "asignados", etiqueta: "Asignados a mí" },
  { valor: "todos", etiqueta: "Todos" },
];

export function TicketsBandeja({
  r,
  tipos,
  instalaciones,
}: {
  r: RespuestaTicketsLista;
  tipos: TipoTicket[];
  instalaciones: InstalacionOpcion[];
}) {
  const items = r.ok ? r.data.items : [];
  const sinTipos = tipos.length === 0;
  return (
    <ListScreen<Ticket>
      state={estadoPantalla(r)}
      titulo="Tickets"
      accionPrincipal={<NuevoTicket tipos={tipos} instalaciones={instalaciones} />}
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
      columnas={COLUMNAS_TICKETS}
      textos={{
        vacio: {
          titulo: sinTipos ? "Aún no puedes crear tickets" : "Sin tickets",
          descripcion: sinTipos
            ? MOTIVO_SIN_TIPOS_TICKET
            : "Los tickets nuevos del tipo que crees aparecerán aquí.",
          accion: sinTipos ? (
            <EnlaceBoton href={CONFIG_TIPOS_TICKET} variante="secondary">
              Configurar tipos de ticket
            </EnlaceBoton>
          ) : undefined,
        },
      }}
    />
  );
}