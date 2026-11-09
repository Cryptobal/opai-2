import Link from "next/link";

import { cn } from "@opai/ds";

import { CLASE_EXCEPCION, codigoCelda, descripcionCelda } from "./celda-turno";
import { claveMes, diaSemana, esNoche } from "./etiquetas";
import { etiquetaPresencia } from "./presencia";
import type { MesPauta } from "./tipos";

const PUNTO = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", neutro: "bg-fg-subtle" } as const;

/** P01 en 1024/1280: puestos × días con la primera columna fija; cada celda abre el día. */
export function GrillaMes({ mes, puedeEditar }: { mes: MesPauta; puedeEditar: boolean }) {
  const dias = mes.puestos[0]?.celdas ?? [];
  return (
    <div className="hidden max-h-[70dvh] overflow-auto rounded-lg border border-border bg-surface lg:block">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-20 min-w-44 border-r border-b border-border bg-surface px-3 py-2 text-left text-xs font-medium text-fg-subtle">
              Puesto
            </th>
            {dias.map((d) => (
              <th
                key={d.fecha}
                title={d.feriado ?? undefined}
                className={cn(
                  "t-numeric sticky top-0 z-10 min-w-9 border-b border-border bg-surface px-0.5 py-1.5 text-center text-xs",
                  d.feriado ? "text-warning-fg" : "text-fg-subtle",
                  d.fecha === mes.hoy && "text-accent",
                )}
              >
                <div>{diaSemana(d.fecha).slice(0, 1).toUpperCase()}</div>
                <div>{Number(d.fecha.slice(8, 10))}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mes.puestos.map((p) => (
            <tr key={p.id}>
              <th className="sticky left-0 z-10 border-r border-b border-border bg-surface px-3 py-1.5 text-left">
                <Link
                  href={`?inst=${mes.instalacionId}&mes=${claveMes(mes.anio, mes.mes)}&serie=${p.id}`}
                  scroll={false}
                  className="block rounded-sm text-base font-medium text-fg outline-none focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {p.nombre}
                </Link>
                <div className="text-xs font-normal text-fg-muted">
                  {p.horario} · {p.serie ? `${p.serie.patron} · ${p.serie.titular ?? "Sin titular"}` : "Sin serie"}
                </div>
              </th>
              {p.celdas.map((c) => {
                const k = codigoCelda(c, esNoche(p.horario));
                const pres = etiquetaPresencia(c);
                return (
                  <td key={c.fecha} className="border-b border-border p-0.5">
                    <Link
                      href={`?inst=${mes.instalacionId}&mes=${claveMes(mes.anio, mes.mes)}&dia=${p.id}_${c.fecha}`}
                      scroll={false}
                      aria-label={`${p.nombre}, ${c.fecha}: ${descripcionCelda(c)}`}
                      className={cn(
                        "flex min-h-9 w-full min-w-8 items-center justify-center rounded-sm text-xs font-medium outline-none focus-visible:outline-2 focus-visible:outline-focus",
                        k.clase,
                        c.excepcion && CLASE_EXCEPCION,
                      )}
                    >
                      {k.texto}
                      {pres ? <span aria-hidden className={cn("ml-0.5 size-1.5 rounded-full", PUNTO[pres.tono])} /> : null}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {puedeEditar ? null : <p className="px-3 py-2 text-xs text-fg-muted">Solo lectura.</p>}
    </div>
  );
}
