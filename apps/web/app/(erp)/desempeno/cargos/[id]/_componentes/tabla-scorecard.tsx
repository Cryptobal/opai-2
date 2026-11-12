import { Badge } from "@opai/ds";

import { conUnidad, type DefinicionIndicador, type Scorecard } from "../../../_componentes/tipos";

type Props = { scorecard: Scorecard; nombres: Map<string, DefinicionIndicador> };

/** Indicadores de una versión del scorecard: qué se mide, la meta del mes y cuánto pesa. */
export function TablaScorecard({ scorecard, nombres }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {scorecard.indicadores.map((i) => {
          const def = nombres.get(i.indicador);
          return (
            <li
              key={i.indicador}
              className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-base font-medium text-fg">
                  {def?.nombre ?? "Indicador que ya no está disponible"}
                </span>
                {def ? <span className="t-caption">{def.descripcion}</span> : null}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="t-body-sm text-fg">
                  Meta {conUnidad(i.meta, def?.unidad ?? null)}
                </span>
                <span className="t-caption">Peso {i.peso} %</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap items-center gap-2 t-caption">
        <Badge tono={scorecard.sumaPesos === 100 ? "success" : "warning"}>
          Pesos: {scorecard.sumaPesos} %
        </Badge>
        {scorecard.personaVeResultado
          ? `La persona ve su resultado${scorecard.personaVeRanking ? " y su posición en el equipo" : ""}.`
          : "La persona no ve su resultado."}
      </p>
    </div>
  );
}
