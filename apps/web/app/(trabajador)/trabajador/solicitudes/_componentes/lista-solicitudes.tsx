import { CalendarOff } from "lucide-react";

import { Badge, Empty } from "@opai/ds";
import { formatearFecha } from "@opai/domain";

import { BotonRetirar } from "./boton-retirar";

export type Solicitud = {
  id: string;
  tipo: string;
  clase: string | null;
  desde: string;
  hasta: string;
  motivo: string;
  estado: string;
  propia: boolean;
};

const TIPO: Record<string, string> = { permiso: "Permiso", vacaciones: "Vacaciones", licencia: "Licencia", ausencia: "Ausencia" };
const ESTADO: Record<string, { texto: string; tono: "warning" | "success" | "danger" | "neutro" }> = {
  solicitada: { texto: "Pendiente", tono: "warning" },
  aprobada: { texto: "Aprobada", tono: "success" },
  rechazada: { texto: "Rechazada", tono: "danger" },
  anulada: { texto: "Retirada", tono: "neutro" },
};

const rango = (s: Solicitud) =>
  s.desde === s.hasta ? formatearFecha(s.desde) : `${formatearFecha(s.desde)} al ${formatearFecha(s.hasta)}`;

/** Permisos, vacaciones, licencias y ausencias de la persona, con su estado (CAR-464). */
export function ListaSolicitudes({ items }: { items: readonly Solicitud[] }) {
  if (items.length === 0)
    return (
      <Empty
        titulo="Aún no tienes permisos ni vacaciones"
        descripcion="Cuando pidas uno, o RR. HH. registre una licencia, aparecerá aquí con su estado."
      />
    );
  return (
    <ul className="-mx-4 divide-y divide-border border-y border-border bg-surface md:mx-0 md:rounded-lg md:border">
      {items.map((s) => {
        const e = ESTADO[s.estado] ?? { texto: s.estado, tono: "neutro" as const };
        return (
          <li key={s.id} className="flex min-h-11 items-center gap-3 px-4 py-3">
            <CalendarOff aria-hidden className="size-5 flex-none text-fg-subtle" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 font-medium text-fg">
                {s.clase ?? TIPO[s.tipo] ?? s.tipo}
                <Badge tono={e.tono}>{e.texto}</Badge>
              </span>
              <span className="t-caption t-numeric">{rango(s)}</span>
              <span className="t-caption truncate">{s.motivo}</span>
            </span>
            {s.propia && s.estado === "solicitada" ? <BotonRetirar id={s.id} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
