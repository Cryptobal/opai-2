import { Button } from "@opai/ds";

import { clp, fechaDdMmAaaa } from "../../../flujo/_componentes/datos";

export type ResultadoPrueba = {
  total: number;
  sinConciliar: number;
  ejemplos: { id: string; fecha: string; glosa: string; monto: number }[];
};

/** Vista previa de la regla: cuántos movimientos de los últimos 120 días calzarían y algunos ejemplos. */
export function PruebaRegla({
  resultado,
  pendiente,
  habilitada,
  onProbar,
}: {
  resultado: ResultadoPrueba | null;
  pendiente: boolean;
  habilitada: boolean;
  onProbar: () => void;
}) {
  return (
    <section className="flex flex-col gap-2" aria-label="Vista previa de la regla">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="t-label">Movimientos que calzarían</p>
        <Button variant="secondary" disabled={pendiente || !habilitada} onClick={onProbar}>
          Probar con los últimos 120 días
        </Button>
      </div>
      {resultado ? (
        resultado.total === 0 ? (
          <p className="t-body-sm text-fg-muted">Ningún movimiento de los últimos 120 días calza con estas condiciones.</p>
        ) : (
          <>
            <p className="t-body-sm text-fg-muted">
              {resultado.total} calzan · {resultado.sinConciliar} sin conciliar todavía.
            </p>
            <ul className="flex flex-col gap-1">
              {resultado.ejemplos.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-b-0">
                  <span className="t-caption w-24 text-fg-muted">{fechaDdMmAaaa(m.fecha)}</span>
                  <span className="t-mono t-body-sm min-w-0 flex-1 break-words">{m.glosa}</span>
                  <span className={`t-mono t-body-sm ${m.monto >= 0 ? "text-success-fg" : "text-danger-fg"}`}>{clp(m.monto)}</span>
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}
    </section>
  );
}
