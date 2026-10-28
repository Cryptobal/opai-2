import { pesos } from "@/lib/fechas";

import type { NegocioFila } from "../datos";
import { TarjetaNegocio } from "./tarjeta-negocio";
import type { EtapaTablero } from "./use-mover";

type Props = {
  etapa: EtapaTablero & { probabilidad: number };
  negocios: NegocioFila[];
  /** Etapas para mover; null si quien mira solo lee (sin arrastre ni «Mover a…»). */
  etapas: EtapaTablero[] | null;
};

const BORDE = {
  ganada: "border-success",
  perdida: "border-danger",
  abierta: "border-border-strong",
};

/**
 * Columna de una etapa: cabecera fija (nombre, contador y suma mensual) y su propio scroll. En el
 * teléfono ocupa el ancho de la pantalla (una columna a la vez, con scroll-snap).
 */
export function ColumnaEtapa({ etapa, negocios, etapas }: Props) {
  const suma = negocios.reduce((a, n) => a + (n.valorMensual ?? n.montoEstimadoMensual ?? 0), 0);
  const cerrada = etapa.tipo !== "abierta";
  return (
    <section
      id={`etapa-${etapa.id}`}
      data-etapa={etapa.id}
      aria-label={`${etapa.nombre}, ${negocios.length} negocios`}
      className="flex max-h-[calc(100dvh-14rem)] w-[calc(100vw-2rem)] flex-none snap-start flex-col rounded-lg bg-fill transition-colors duration-150 data-[sobre]:bg-accent-muted motion-reduce:transition-none md:w-68"
    >
      <header
        className={`flex flex-none flex-col gap-0.5 border-b-2 px-3 pt-3 pb-2 ${BORDE[etapa.tipo as keyof typeof BORDE] ?? BORDE.abierta}`}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-label truncate text-fg">{etapa.nombre}</h2>
          <span className="t-body-sm t-numeric text-fg-muted">{negocios.length}</span>
        </div>
        <span className="t-caption t-numeric">
          {pesos(suma)}
          {cerrada ? "" : ` · ${etapa.probabilidad} %`}
        </span>
      </header>
      <div className="flex min-h-24 flex-col gap-2 overflow-y-auto overscroll-contain p-2">
        {negocios.map((n) => (
          <TarjetaNegocio key={n.id} n={n} etapas={etapas} />
        ))}
        {!negocios.length ? (
          <p className="t-caption px-1 py-4 text-center">Sin negocios en esta etapa.</p>
        ) : null}
      </div>
    </section>
  );
}
