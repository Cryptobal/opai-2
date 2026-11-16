import type { ReactNode } from "react";

import { identidadActual } from "@/lib/servidor";

import { AccionesTicket } from "../[id]/_componentes/acciones";
import { cargarTicket, nombreInstalacion, type Ticket } from "./datos";
import { FichaTicket, type TabTicket } from "./ficha-ticket";
import { TabResumenTicket } from "./tab-resumen-ticket";

type Props = {
  datos: ReturnType<typeof cargarTicket>;
  tab: TabTicket;
  children: (ticket: Ticket) => ReactNode;
};

/** Panel derecho de un ticket (lista/ficha CAR-545). */
export async function DetalleTicket({ datos, tab, children }: Props) {
  const [ficha, identidad] = await Promise.all([datos, identidadActual()]);
  const instalacion = await nombreInstalacion(ficha.ticket?.instalacionId ?? null);
  const t = ficha.ticket;
  const usuarioId = identidad?.usuario.id ?? null;
  return (
    <FichaTicket
      state={ficha.state}
      ticket={t}
      tab={tab}
      acciones={t ? <AccionesTicket id={t.id} ticket={t} usuarioId={usuarioId} /> : undefined}
    >
      {t
        ? tab === "resumen"
          ? <TabResumenTicket ticket={t} eventos={ficha.eventos} instalacion={instalacion} />
          : children(t)
        : null}
    </FichaTicket>
  );
}