import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarTickets, cargarTipos, filtrosDe } from "./_componentes/datos";
import { TicketsBandeja } from "./_componentes/tickets-bandeja";

export const metadata = { title: "Tickets" };
type Props = { searchParams: SearchParams };

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
        const [r, tipos] = await Promise.all([cargarTickets(p), cargarTipos()]);
        return { p, r, tipos: tipos.ok ? tipos.data : [] };
      }}
    >
      {({ r, tipos }) => <TicketsBandeja r={r} tipos={tipos} />}
    </PaginaPortal>
  );
}