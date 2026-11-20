import { FichaDocumentos } from "@/app/_components/documentos/ficha-documentos";
import type { SearchParams } from "@/lib/parametros";

import { PaginaTicket } from "../../_componentes/pagina-ticket";

export const metadata = { title: "Documentos del ticket" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Adjuntos del ticket vía core.documentos (CAR-496, ADR-019). */
export default function DocumentosTicket(props: Props) {
  return (
    <PaginaTicket {...props} tab="documentos">
      {(t) => <FichaDocumentos entidad={{ tipo: "ticket", id: t.id }} />}
    </PaginaTicket>
  );
}