import Link from "next/link";

import { Badge, cn } from "@opai/ds";

import { descripcionCelda } from "./celda-turno";
import { diaSemana, fechaCl, MOTIVO } from "./etiquetas";
import type { CeldaDia, MesPauta } from "./tipos";

function EstadoDia({ c }: { c: CeldaDia }) {
  if (c.estado === "cubierto") return <Badge tono="success">Cubierto</Badge>;
  if (c.estado === "ppc") return <Badge tono="danger">PPC · {c.motivo ? MOTIVO[c.motivo] : ""}</Badge>;
  return <Badge>{c.estado === "libre" ? "Libre" : "Sin serie"}</Badge>;
}

/** Puestos de la instalación con su serie: en 375 no hay fila de grilla desde donde abrirla. */
function PuestosDeLaInstalacion({ mes }: { mes: MesPauta }) {
  return (
    <section aria-label="Puestos" className="rounded-lg border border-border bg-surface">
      <h3 className="t-label px-4 py-2">Puestos</h3>
      <ul className="divide-y divide-border">
        {mes.puestos.map((p) => (
          <li key={p.id}>
            <Link
              href={`?serie=${p.id}`}
              scroll={false}
              className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 outline-none focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-medium">{p.nombre}</span>
                <span className="block truncate text-xs text-fg-muted">
                  {p.horario} · {p.serie ? `${p.serie.patron} · ${p.serie.titular ?? "Sin titular"}` : "Sin serie"}
                </span>
              </span>
              <Badge tono={p.serie ? "neutro" : "warning"}>{p.serie ? "Serie" : "Sin serie"}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** P01 en 375: lista por día, sin grilla. Muestra solo lo que tiene turno; el día libre se omite. */
export function ListaDias({ mes }: { mes: MesPauta }) {
  const fechas = mes.puestos[0]?.celdas.map((c) => c.fecha) ?? [];
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <PuestosDeLaInstalacion mes={mes} />
      {fechas.map((fecha, i) => {
        const filas = mes.puestos
          .map((p) => ({ p, c: p.celdas[i]! }))
          .filter(({ c }) => c.estado !== "libre" && c.estado !== "sin_serie");
        if (filas.length === 0) return null;
        const feriado = mes.puestos[0]?.celdas[i]?.feriado;
        return (
          <section key={fecha} aria-label={fechaCl(fecha)} className="rounded-lg border border-border bg-surface">
            <header className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2", fecha === mes.hoy && "text-accent")}>
              <h3 className="t-label whitespace-nowrap capitalize">
                {diaSemana(fecha)} {fechaCl(fecha)}
              </h3>
              {feriado ? <Badge tono="warning">{feriado}</Badge> : null}
            </header>
            <ul className="divide-y divide-border">
              {filas.map(({ p, c }) => (
                <li key={p.id}>
                  <Link
                    href={`?dia=${p.id}_${fecha}`}
                    scroll={false}
                    aria-label={`${p.nombre}: ${descripcionCelda(c)}`}
                    className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 outline-none focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium">{p.nombre}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {p.horario} · {p.serie?.titular ?? "Sin titular"}
                      </span>
                    </span>
                    <EstadoDia c={c} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
