import { Badge, DetailScreen, Pares } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fecha } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { identidadActual } from "@/lib/servidor";

import { AccionesTicket } from "./_componentes/acciones";
import {
  cargarTicket,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  type EventoTicket,
  TONO_ESTADO,
  TONO_PRIORIDAD,
} from "../_componentes/datos";

export const metadata = { title: "Ticket" };
type Props = { params: Promise<{ id: string }> };

const ETIQUETA_EVENTO: Record<string, string> = {
  creado: "Se creó el ticket",
  comentario: "Comentó",
  cambio_estado: "Cambió el estado",
  reasignado: "Reasignó el ticket",
  aprobado: "Aprobó la solicitud",
  rechazado: "Rechazó la solicitud",
};

/** Ficha del ticket (modulos/tickets.md §3): timeline, comentar y la aprobación desde aquí (decisión 4). */
export default function TicketFicha({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Ticket"
      ruta="/tickets"
      cargar={async () => {
        const [{ id }, identidad] = await Promise.all([params, identidadActual()]);
        const r = await cargarTicket(id);
        return { id, r, usuarioId: identidad?.usuario.id ?? null };
      }}
      opciones={({ r }) => ({ titulo: r.ok ? r.data.ticket.titulo : "Ticket" })}
    >
      {({ id, r, usuarioId }) => {
        const t = r.ok ? r.data.ticket : null;
        const eventos = r.ok ? r.data.eventos : [];
        return (
          <DetailScreen
            state={estadoPantalla(r)}
            titulo={t?.titulo ?? "Ticket"}
            subtitulo={t ? `${t.tipoNombre} · solicitado ${fecha(t.createdAt)}` : undefined}
            estado={
              t ? (
                <span className="flex items-center gap-2">
                  <Badge tono={TONO_ESTADO[t.estado] ?? "neutro"}>
                    {ETIQUETA_ESTADO[t.estado] ?? t.estado}
                  </Badge>
                  <Badge tono={TONO_PRIORIDAD[t.prioridad] ?? "neutro"}>
                    {ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}
                  </Badge>
                </span>
              ) : undefined
            }
            acciones={t ? <AccionesTicket id={id} ticket={t} usuarioId={usuarioId} /> : undefined}
          >
            {t ? (
              <div className="flex flex-col gap-4">
                <Pares
                  items={[
                    { etiqueta: "Descripción", valor: t.descripcion },
                    ...(t.motivoRechazo ? [{ etiqueta: "Motivo del rechazo", valor: t.motivoRechazo }] : []),
                    ...(t.resueltoEn ? [{ etiqueta: "Resuelto", valor: fecha(t.resueltoEn) }] : []),
                    ...(t.cerradoEn ? [{ etiqueta: "Cerrado", valor: fecha(t.cerradoEn) }] : []),
                  ]}
                />
                <section className="flex flex-col gap-2">
                  <h3 className="t-label text-fg">Línea de tiempo</h3>
                  <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                    {eventos.map((e: EventoTicket) => (
                      <li
                        key={e.id}
                        className="flex flex-col gap-1 border-b border-border px-4 py-2.5 last:border-b-0"
                      >
                        <span className="t-caption">
                          {ETIQUETA_EVENTO[e.tipo] ?? e.tipo} · {fecha(e.createdAt)}
                        </span>
                        {e.comentario ? (
                          <span className="text-base text-fg">{e.comentario}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
