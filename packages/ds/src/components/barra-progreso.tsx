import { cn } from "../cn";

type Props = {
  /** Fracción 0–1 (se recorta a ese rango). */
  valor: number;
  /** Nombre accesible ("Presupuesto usado"). */
  etiqueta: string;
  /** Color de estado: acento normal, advertencia (≥ 80 %), peligro (≥ 100 %); `neutro` para comparar cantidades. */
  tono?: "accent" | "warning" | "danger" | "neutro";
  /** Segundo tramo gris a continuación del avance (fracción 0–1): el resto de un total comparable. */
  resto?: number;
  className?: string;
};

const TONO = {
  accent: "bg-accent",
  warning: "bg-warning-fg",
  danger: "bg-danger-fg",
  neutro: "bg-fg",
} as const;

/** Barra de progreso de 6 px (presupuesto de una key, consumo del mes): riel `fill`, avance de color. */
export function BarraProgreso({ valor, etiqueta, tono = "accent", resto, className }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  const pctResto = Math.min(100 - pct, Math.round(Math.max(0, resto ?? 0) * 100));
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-fill", className)}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-200 motion-reduce:transition-none",
          pctResto ? "rounded-l-full" : "rounded-full",
          TONO[tono],
        )}
        style={{ width: `${pct}%` }}
      />
      {pctResto ? (
        <div className="h-full rounded-r-full bg-border-strong" style={{ width: `${pctResto}%` }} />
      ) : null}
    </div>
  );
}

/** Tono según el uso: ≥ 100 % peligro, ≥ 80 % advertencia. */
export const tonoUso = (f: number) => (f >= 1 ? "danger" : f >= 0.8 ? "warning" : "accent");
