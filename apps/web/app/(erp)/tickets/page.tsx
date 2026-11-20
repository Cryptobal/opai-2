import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarInstalaciones, cargarTickets, cargarTipos } from "./_componentes/datos";
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
        const p = await leerParametros(searchParams);
        const [bandeja, tipos, instalaciones] = await Promise.all([
          cargarTickets(p),
          cargarTipos(),
          cargarInstalaciones(),
        ]);
        return { p, bandeja, tipos: tipos.ok ? tipos.data : [], instalaciones };
      }}
    >
      {({ p, bandeja, tipos, instalaciones }) => (
        <TicketsBandeja p={p} bandeja={bandeja} tipos={tipos} instalaciones={instalaciones} />
      )}
    </PaginaPortal>
  );
}
