import type { SearchParams } from "@/lib/parametros";

import { PaginaTicket } from "../_componentes/pagina-ticket";

export const metadata = { title: "Ticket" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Ficha del ticket · resumen (CAR-496: lista/ficha con pestaña Documentos). */
export default function TicketResumen(props: Props) {
  return (
    <PaginaTicket {...props} tab="resumen">
      {() => null}
    </PaginaTicket>
  );
}