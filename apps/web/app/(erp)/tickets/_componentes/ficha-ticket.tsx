import type { ReactNode } from "react";

import { Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fecha } from "@/lib/fechas";

import {
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  TONO_ESTADO,
  TONO_PRIORIDAD,
  type Ticket,
} from "./datos";

export type TabTicket = "resumen" | "documentos";

/** Cabecera y pestañas de la ficha del ticket (CAR-496 · patrón lista/ficha). */
export function FichaTicket(p: {
  state: EstadoPantalla;
  ticket: Ticket | null;
  tab: TabTicket;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  const t = p.ticket;
  const base = t ? `/tickets/${t.id}` : "";
  return (
    <DetailScreen
      state={p.state}
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
      acciones={p.acciones}
      tabActiva={p.tab}
      Link={LinkNext}
      {...(t
        ? {
            tabs: [
              { id: "resumen", etiqueta: "Resumen", href: base },
              { id: "documentos", etiqueta: "Documentos", href: `${base}/documentos` },
            ] as const,
          }
        : {})}
    >
      {p.children}
    </DetailScreen>
  );
}