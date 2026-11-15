import { cn } from "../cn";

export type PuntoSaldo = {
  /** Etiqueta del período ("Semana del 9 nov", "Noviembre 2026"). */
  etiqueta: string;
  valor: number;
  /** Texto del valor ya formateado ("$ 12,3 M"). */
  texto: string;
  /** Tono del punto: bajo el umbral o negativo. */
  tono?: "peligro" | "alerta" | null;
};

type Props = {
  /** Nombre accesible del gráfico ("Saldo proyectado por semana"). */
  etiqueta: string;
  puntos: readonly PuntoSaldo[];
  /** Línea punteada de referencia (umbral de saldo bajo) y su texto. */
  umbral?: { valor: number; texto: string } | undefined;
  className?: string;
};

const ANCHO = 600;
const ALTO = 160;
const MARGEN = 8;
const TONO = { peligro: "text-danger-fg", alerta: "text-warning-fg" } as const;

/**
 * Línea de saldo por período, con el cero y el umbral como referencias. Sin JS: SVG servido desde el servidor.
 * Admite saldos negativos (bajo la línea del cero). Los tramos bajo el umbral o negativos van con su tono. Para
 * lectores de pantalla, los valores van en una lista oculta.
 */
export function LineaSaldo({ etiqueta, puntos, umbral, className }: Props) {
  if (!puntos.length) return null;
  const valores = [...puntos.map((p) => p.valor), 0, ...(umbral ? [umbral.valor] : [])];
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;
  const y = (v: number) => MARGEN + ((max - v) / rango) * (ALTO - 2 * MARGEN);
  const x = (i: number) =>
    puntos.length === 1 ? ANCHO / 2 : MARGEN + (i / (puntos.length - 1)) * (ANCHO - 2 * MARGEN);
  const linea = puntos.map((p, i) => `${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  // Tramo que llega al período (o un trazo corto si es el primero): se pinta con el tono del período.
  const tramo = (i: number) => {
    const desde =
      i === 0
        ? { x: x(0), v: puntos[0]?.valor ?? 0 }
        : { x: x(i - 1), v: puntos[i - 1]?.valor ?? 0 };
    const hasta = puntos[i]?.valor ?? 0;
    return `${desde.x.toFixed(1)},${y(desde.v).toFixed(1)} ${Math.max(x(i), desde.x + 6).toFixed(1)},${y(hasta).toFixed(1)}`;
  };
  const primero = puntos[0];
  const ultimo = puntos.at(-1);
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <svg
        role="img"
        aria-label={etiqueta}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        preserveAspectRatio="none"
        className="h-40 w-full text-fg"
      >
        <line
          x1={0}
          x2={ANCHO}
          y1={y(0)}
          y2={y(0)}
          stroke="currentColor"
          strokeOpacity={0.25}
          vectorEffect="non-scaling-stroke"
        />
        {umbral ? (
          <g className="text-warning-fg">
            <line
              x1={0}
              x2={ANCHO}
              y1={y(umbral.valor)}
              y2={y(umbral.valor)}
              stroke="currentColor"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ) : null}
        <polyline
          points={linea}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {puntos.map((p, i) =>
          p.tono ? (
            <g key={p.etiqueta} className={TONO[p.tono]}>
              <polyline
                points={tramo(i)}
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null,
        )}
      </svg>
      <figcaption className="t-caption flex flex-wrap justify-between gap-x-4 gap-y-1">
        <span>{primero ? `${primero.etiqueta}: ${primero.texto}` : null}</span>
        {umbral ? <span className="text-warning-fg">Umbral {umbral.texto}</span> : null}
        <span>{ultimo && ultimo !== primero ? `${ultimo.etiqueta}: ${ultimo.texto}` : null}</span>
      </figcaption>
      <ul className="sr-only">
        {puntos.map((p) => (
          <li key={p.etiqueta}>
            {p.etiqueta}: {p.texto}
          </li>
        ))}
      </ul>
    </figure>
  );
}
