import { Badge } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { ListaMaestroSplit } from "@/app/_components/maestros/lista-maestro-split";
import type { Parametros } from "@/lib/parametros";

import { NuevoTicket } from "./nuevo-ticket";
import {
  type cargarTickets,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  TONO_ESTADO,
  TONO_PRIORIDAD,
  type Ticket,
  type TipoTicket,
} from "./datos";

const OPCIONES_VISTA = [
  { valor: "mios", etiqueta: "Míos" },
  { valor: "asignados", etiqueta: "Asignados a mí" },
  { valor: "todos", etiqueta: "Todos" },
];

const filasDe = (items: Ticket[]) =>
  items.map((t) => ({
    id: t.id,
    href: `/tickets/${t.id}`,
    titulo: (
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{t.titulo}</span>
        <Badge tono={TONO_PRIORIDAD[t.prioridad] ?? "neutro"} className="hidden md:inline-flex">
          {ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}
        </Badge>
      </span>
    ),
    secundario: t.tipoNombre,
    fin: (
      <Badge tono={TONO_ESTADO[t.estado] ?? "neutro"} punto={false}>
        {ETIQUETA_ESTADO[t.estado] ?? t.estado}
      </Badge>
    ),
  }));

const vacio = {
  titulo: "Sin tickets",
  descripcion: "Los tickets nuevos del tipo que crees aparecerán aquí.",
};

export function ListaTickets(p: {
  p: Parametros;
  lista: Awaited<ReturnType<typeof cargarTickets>>;
  tipos: TipoTicket[];
  instalaciones?: { id: string; nombre: string }[];
  seleccionada?: string;
  /** Sin buscador ni chips (columna del split). */
  compacta?: boolean;
}) {
  const filas = filasDe(p.lista.items);
  const accion = <NuevoTicket tipos={p.tipos} instalaciones={p.instalaciones ?? []} />;
  const meta = { izquierda: `${p.lista.items.length} tickets` };

  if (p.compacta) {
    return (
      <ListaMaestroSplit
        state={p.lista.state}
        titulo="Tickets"
        accion={accion}
        meta={meta}
        filas={filas}
        {...(p.seleccionada !== undefined ? { seleccionada: p.seleccionada } : {})}
        vacio={vacio}
      />
    );
  }

  return (
    <ListaMaestro
      state={p.lista.state}
      titulo="Tickets"
      accion={accion}
      buscar=""
      filtros={[{ param: "vista", etiqueta: "Vista", opciones: OPCIONES_VISTA }]}
      meta={meta}
      filas={filas}
      {...(p.seleccionada !== undefined ? { seleccionada: p.seleccionada } : {})}
      vacio={vacio}
    />
  );
}