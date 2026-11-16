import { Badge, Empty } from "@opai/ds";
import { formatearFecha } from "@opai/domain";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

export type TicketCliente = {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  instalacion: string;
  abiertoEl: string;
};

const ESTADO: Record<string, { tono: "success" | "warning" | "neutro" | "info" | "danger"; texto: string }> = {
  abierto: { tono: "warning", texto: "Recibido" },
  en_curso: { tono: "info", texto: "En curso" },
  resuelto: { tono: "success", texto: "Resuelto" },
  cerrado: { tono: "neutro", texto: "Cerrado" },
  rechazado: { tono: "danger", texto: "No procede" },
};

/** Tickets que abrió el contacto (CAR-519), del más reciente al más antiguo, con su estado. Sin notas internas. */
export function ListaTickets({
  items,
  siguiente,
  puedeAbrir,
}: {
  items: TicketCliente[];
  siguiente: string | null;
  puedeAbrir: boolean;
}) {
  if (items.length === 0)
    return (
      <Empty
        titulo="Sin tickets"
        descripcion={
          puedeAbrir
            ? "Usa «Abrir un ticket» para pedir algo a tu empresa de seguridad. Aquí verás en qué estado va."
            : "Tu empresa de seguridad aún no habilitó tipos de ticket para clientes."
        }
      />
    );
  return (
    <div className="flex flex-col gap-4">
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((t) => {
          const e = ESTADO[t.estado] ?? { tono: "neutro" as const, texto: t.estado };
          return (
            <li key={t.id} className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium text-fg">{t.titulo}</span>
                <span className="block truncate text-sm text-fg-muted">
                  {[t.tipo, t.instalacion, `Abierto el ${formatearFecha(t.abiertoEl)}`].join(" · ")}
                </span>
              </span>
              <Badge tono={e.tono}>{e.texto}</Badge>
            </li>
          );
        })}
      </ul>
      {siguiente ? (
        <div>
          <EnlaceBoton href={`/cliente/tickets?desde=${siguiente}`} variante="secondary">
            Ver más antiguos
          </EnlaceBoton>
        </div>
      ) : null}
    </div>
  );
}
