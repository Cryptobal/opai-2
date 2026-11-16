import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { ListaTickets } from "./_componentes/lista-tickets";
import { cargarInstalaciones, cargarTickets, cargarTipos, filtrosDe } from "./_componentes/datos";

export const metadata = { title: "Tickets" };
type Props = { searchParams: SearchParams };

/** Bandeja de tickets: en escritorio solo la lista; la ficha abre en `/tickets/[id]`. */
export default function Tickets({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Tickets"
      ruta="/tickets"
      completo
      cargar={async () => {
        const p = await filtrosDe(searchParams);
        const [lista, tipos, instalaciones] = await Promise.all([
          cargarTickets(p),
          cargarTipos(),
          cargarInstalaciones(),
        ]);
        return { p, lista, tipos: tipos.ok ? tipos.data : [], instalaciones };
      }}
    >
      {({ p, lista, tipos, instalaciones }) => (
        <ListaTickets p={p} lista={lista} tipos={tipos} instalaciones={instalaciones} />
      )}
    </PaginaPortal>
  );
}
