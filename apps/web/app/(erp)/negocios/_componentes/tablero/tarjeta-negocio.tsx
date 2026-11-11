import { Avatar, Badge } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fecha, pesos } from "@/lib/fechas";

import type { NegocioFila } from "../datos";
import { fichaDesdeTablero } from "../rutas";
import { MoverA } from "./mover-a";
import type { EtapaTablero } from "./use-mover";

const CERRADO = { abierto: "Abierto", ganado: "Ganado", perdido: "Perdido" } as const;

/**
 * Tarjeta del tablero (export «Negocios · Tablero»): título (enlace a la ficha), cuenta, indicador
 * del seguimiento si corresponde (spec §4, CAR-160), valor mensual, cierre y
 * responsable. Abierta: se arrastra y tiene «Mover a…»; cerrada: solo se abre.
 */
export function TarjetaNegocio(p: { n: NegocioFila; etapas: EtapaTablero[] | null }) {
  const { n, etapas } = p;
  const abierto = n.estado === "abierto";
  const movible = abierto && etapas !== null;
  const monto = n.valorMensual ?? n.montoEstimadoMensual;
  return (
    <article
      data-negocio={n.id}
      draggable={movible}
      aria-label={n.titulo}
      className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-3 transition-opacity duration-150 aria-busy:opacity-50 motion-reduce:transition-none md:p-4 [&[draggable=true]]:cursor-grab"
    >
      <div className="flex items-start gap-2">
        <LinkNext
          href={fichaDesdeTablero(n.id, n.etapaId)}
          className="min-w-0 flex-1 py-1 text-base font-medium text-fg outline-none hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {n.titulo}
        </LinkNext>
        {movible ? (
          <MoverA negocioId={n.id} titulo={n.titulo} etapaActual={n.etapaId} etapas={etapas} />
        ) : null}
      </div>
      <span className="t-body-sm truncate text-fg-muted">{n.cuentaNombre}</span>
      {abierto && n.seguimiento ? (
        <Badge tono={n.seguimiento.tono} className="self-start">
          {n.seguimiento.texto}
        </Badge>
      ) : null}
      <div className="flex items-baseline justify-between gap-2">
        <span className="t-numeric font-semibold">
          {monto != null ? pesos(monto) : "Sin monto"}
        </span>
        {n.cierreEstimado ? (
          <span className="t-caption t-numeric">Cierre {fecha(n.cierreEstimado)}</span>
        ) : null}
      </div>
      {n.responsableNombre || !abierto ? (
        <div className="flex items-center justify-between gap-2">
          {n.responsableNombre ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar nombre={n.responsableNombre} size="sm" />
              <span className="t-caption truncate">{n.responsableNombre}</span>
            </span>
          ) : (
            <span />
          )}
          {!abierto ? (
            <Badge tono={n.estado === "ganado" ? "success" : "danger"}>{CERRADO[n.estado]}</Badge>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
