import { Pares } from "@opai/ds";

import { fecha } from "@/lib/fechas";

import { type EventoTicket, type Ticket } from "./datos";

const ETIQUETA_EVENTO: Record<string, string> = {
  creado: "Se creó el ticket",
  comentario: "Comentó",
  cambio_estado: "Cambió el estado",
  reasignado: "Reasignó el ticket",
  aprobado: "Aprobó la solicitud",
  rechazado: "Rechazó la solicitud",
};

export function TabResumenTicket({
  ticket: t,
  eventos,
  instalacion,
}: {
  ticket: Ticket;
  eventos: EventoTicket[];
  instalacion?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Pares
        items={[
          { etiqueta: "Descripción", valor: t.descripcion },
          ...(instalacion ? [{ etiqueta: "Instalación", valor: instalacion }] : []),
          ...(t.motivoRechazo ? [{ etiqueta: "Motivo del rechazo", valor: t.motivoRechazo }] : []),
          ...(t.resueltoEn ? [{ etiqueta: "Resuelto", valor: fecha(t.resueltoEn) }] : []),
          ...(t.cerradoEn ? [{ etiqueta: "Cerrado", valor: fecha(t.cerradoEn) }] : []),
        ]}
      />
      <section className="flex flex-col gap-2">
        <h3 className="t-label text-fg">Línea de tiempo</h3>
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {eventos.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 border-b border-border px-4 py-2.5 last:border-b-0">
              <span className="t-caption">
                {ETIQUETA_EVENTO[e.tipo] ?? e.tipo} · {fecha(e.createdAt)}
              </span>
              {e.comentario ? <span className="text-base text-fg">{e.comentario}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}