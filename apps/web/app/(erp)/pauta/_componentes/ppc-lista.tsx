import Link from "next/link";

import { Badge, Empty } from "@opai/ds";

import { claveMes, fechaCl, MOTIVO } from "./etiquetas";
import type { Ppc } from "./tipos";

/** P06 como filtro de Mensual: puestos sin cubrir del período, por tramo y motivo. */
export function PpcLista({ ppc, anio, mes }: { ppc: readonly Ppc[]; anio: number; mes: number }) {
  if (ppc.length === 0)
    return <Empty titulo="Todo el mes está cubierto" descripcion="No hay puestos por cubrir en este período." />;
  return (
    <ul className="flex flex-col gap-2" aria-label="Puestos sin cubrir">
      {ppc.map((x) => (
        <li key={`${x.puestoId}-${x.motivo}-${x.desde}`}>
          <Link
            href={`?inst=${x.instalacionId}&mes=${claveMes(anio, mes)}&dia=${x.puestoId}_${x.desde}`}
            className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 outline-none focus-visible:outline-2 focus-visible:outline-focus"
          >
            <span className="min-w-0">
              <span className="block truncate text-base font-medium">{x.puesto}</span>
              <span className="block truncate text-xs text-fg-muted">
                {x.instalacion} · {x.desde === x.hasta ? fechaCl(x.desde) : `${fechaCl(x.desde)} al ${fechaCl(x.hasta)}`} · {x.dias} {x.dias === 1 ? "día" : "días"}
              </span>
            </span>
            <Badge tono="danger">{MOTIVO[x.motivo]}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
