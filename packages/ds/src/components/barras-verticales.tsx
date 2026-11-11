import { cn } from "../cn";

export type BarraVertical = {
  etiqueta: string;
  /** Texto del valor sobre la barra ("$ 6,5 M"). */
  valor: string;
  /** Altura relativa 0–1 respecto de la barra más alta. */
  fraccion: number;
};

type Props = {
  /** Nombre accesible del gráfico ("Pronóstico por mes"). */
  etiqueta: string;
  barras: readonly BarraVertical[];
  className?: string;
};

/** Barras verticales de pocas categorías (pronóstico por mes): valor arriba, etiqueta abajo, 160 px de alto. */
export function BarrasVerticales({ etiqueta, barras, className }: Props) {
  return (
    <ul aria-label={etiqueta} className={cn("flex h-40 items-stretch gap-3", className)}>
      {barras.map((b) => (
        <li key={b.etiqueta} className="flex min-w-0 flex-1 flex-col justify-end gap-1.5">
          <span className="t-caption t-numeric truncate text-center">{b.valor}</span>
          <span
            aria-hidden="true"
            className="block min-h-0.5 rounded-t-md bg-fg"
            style={{ height: `${Math.round(Math.min(1, Math.max(0, b.fraccion)) * 110)}px` }}
          />
          <span className="t-body-sm truncate text-center">{b.etiqueta}</span>
        </li>
      ))}
    </ul>
  );
}
