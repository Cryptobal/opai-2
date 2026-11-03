import { Badge } from "@opai/ds";

import { margenPctTexto, semaforoEtiqueta } from "@/lib/cpq-presentacion";

/** Barra de margen con marca del mínimo (mockup SemaforoMargen, versión compacta). */
export function SemaforoMargenCpq({
  margenEfectivoPct,
  semaforo,
  minimoPct = 100_000,
}: {
  margenEfectivoPct?: number;
  semaforo?: string;
  minimoPct?: number;
}) {
  const pct =
    margenEfectivoPct != null && margenEfectivoPct >= 0 ? margenEfectivoPct / 10_000 : null;
  const min = minimoPct / 10_000;
  const tono =
    semaforo === "verde" ? "success" : semaforo === "rojo" ? "danger" : ("warning" as const);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="t-overline text-fg-muted">Margen efectivo</span>
        {/* Sin cálculo no hay semáforo: el margen se muestra «—» sin color (CAR-162). */}
        {semaforo && pct != null ? <Badge tono={tono}>{semaforoEtiqueta(semaforo)}</Badge> : null}
      </div>
      <p className="t-h3 t-numeric">{margenPctTexto(margenEfectivoPct)}</p>
      {pct != null ? (
        <div className="relative h-2 overflow-hidden rounded-full bg-fill">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            style={{
              width: `${Math.min(100, Math.max(0, (pct / Math.max(min * 1.5, 1)) * 100))}%`,
            }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-fg-muted"
            style={{ left: `${Math.min(100, (min / Math.max(min * 1.5, 1)) * 100)}%` }}
            title={`Mínimo ${min.toFixed(1)} %`}
          />
        </div>
      ) : (
        <p className="t-caption text-fg-muted">Pendiente de costos</p>
      )}
    </div>
  );
}
